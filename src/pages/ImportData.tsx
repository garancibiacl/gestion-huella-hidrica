import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ParsedData {
  period: string;
  consumo_m3: number;
  costo?: number;
  observaciones?: string;
}

// Map of Spanish month names to numbers
const monthMap: Record<string, string> = {
  'enero': '01', 'ene': '01', 'jan': '01',
  'febrero': '02', 'feb': '02',
  'marzo': '03', 'mar': '03',
  'abril': '04', 'abr': '04', 'apr': '04',
  'mayo': '05', 'may': '05',
  'junio': '06', 'jun': '06',
  'julio': '07', 'jul': '07',
  'agosto': '08', 'ago': '08', 'aug': '08',
  'septiembre': '09', 'sep': '09', 'sept': '09',
  'octubre': '10', 'oct': '10',
  'noviembre': '11', 'nov': '11',
  'diciembre': '12', 'dic': '12', 'dec': '12',
};

// Parse various period formats to YYYY-MM
function parsePeriod(rawValue: unknown, year?: number): string | null {
  // Handle Excel date serial numbers
  if (typeof rawValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + rawValue * 24 * 60 * 60 * 1000);
    const parsedYear = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    if (parsedYear >= 2000 && parsedYear <= 2100) {
      return `${parsedYear}-${month}`;
    }
    return null;
  }

  const period = String(rawValue || '').trim().toUpperCase();
  if (!period) return null;

  // Format: YYYY-MM (already correct)
  if (/^\d{4}-\d{2}$/.test(period)) {
    return period;
  }

  // Format: MM/YYYY or M/YYYY
  const slashMatch = period.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const yr = slashMatch[2];
    return `${yr}-${month}`;
  }

  // Format: YYYY/MM
  const slashMatch2 = period.match(/^(\d{4})\/(\d{1,2})$/);
  if (slashMatch2) {
    const yr = slashMatch2[1];
    const month = slashMatch2[2].padStart(2, '0');
    return `${yr}-${month}`;
  }

  // Format: MM-YYYY
  const dashMatch = period.match(/^(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const month = dashMatch[1].padStart(2, '0');
    const yr = dashMatch[2];
    return `${yr}-${month}`;
  }

  // Format: "Ene-2025", "Enero 2025", "ene 2025", "ene-25", or just "ENERO"
  const normalized = period.toLowerCase().replace(/[^a-záéíóú0-9]/g, ' ').trim();
  const parts = normalized.split(/\s+/);
  
  for (const part of parts) {
    if (monthMap[part]) {
      // Find year in the string
      const yearMatch = period.match(/\d{4}/) || period.match(/\d{2}$/);
      if (yearMatch) {
        let yr = yearMatch[0];
        if (yr.length === 2) {
          yr = yr.startsWith('9') ? `19${yr}` : `20${yr}`;
        }
        return `${yr}-${monthMap[part]}`;
      } else if (year) {
        // Use provided year if no year in string
        return `${year}-${monthMap[part]}`;
      }
    }
  }

  return null;
}

// Detect format type based on columns
type FileFormat = 'simple' | 'esval' | 'powerbi';

function detectFormat(headers: string[]): FileFormat {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  // ESVAL format has specific columns
  if (lowerHeaders.some(h => h.includes('m3 netos') || h.includes('lectura anterior'))) {
    return 'esval';
  }
  
  // Power BI format has Faena, Centro de Trabajo, Litros
  if (lowerHeaders.some(h => h.includes('faena') || h.includes('centro de trabajo') || h.includes('litros'))) {
    return 'powerbi';
  }
  
  return 'simple';
}

// Parse ESVAL format (CONSUMO_DE_AGUA_PERIODO.xlsx)
function parseEsvalFormat(rows: Record<string, unknown>[]): { parsed: ParsedData[], errors: string[] } {
  const parsed: ParsedData[] = [];
  const errors: string[] = [];
  const currentYear = new Date().getFullYear();

  rows.forEach((row, index) => {
    // Skip header/metadata rows
    const mes = row['MES'] || row['Mes'] || row['mes'];
    const consumo = row['M3 NETOS CONSUMIDOS POR PERÍODO'] || row['M3 NETOS CONSUMIDOS POR PERIODO'] || 
                   row['m3 netos consumidos por período'] || row['Consumo'];
    const costo = row['TOTAL A PAGAR'] || row['Total a Pagar'] || row['Costo'];
    const obs = row['OBSERVACIONES'] || row['Observaciones'] || '';

    if (!mes || typeof mes !== 'string') return;

    const period = parsePeriod(mes, currentYear);
    if (!period) {
      errors.push(`Fila ${index + 2}: No se pudo parsear el mes "${mes}"`);
      return;
    }

    const consumoNum = typeof consumo === 'number' ? consumo : 
                       parseFloat(String(consumo || '0').replace(/[^\d.-]/g, ''));
    
    if (isNaN(consumoNum) || consumoNum <= 0) {
      errors.push(`Fila ${index + 2}: Consumo inválido`);
      return;
    }

    const costoStr = String(costo || '').replace(/[$.,\s]/g, '');
    const costoNum = parseInt(costoStr) || undefined;

    parsed.push({
      period,
      consumo_m3: consumoNum,
      costo: costoNum,
      observaciones: String(obs || '') || undefined
    });
  });

  return { parsed, errors };
}

// Parse Power BI format (Control_de_Agua_Para_Power_Bi.xlsx) - aggregates by month
function parsePowerBiFormat(rows: Record<string, unknown>[]): { parsed: ParsedData[], errors: string[] } {
  const aggregated: Record<string, { litros: number; costo: number; faenas: Set<string> }> = {};
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const mes = row['Mes'] || row['mes'] || row['MES'];
    const fecha = row['Fecha'] || row['fecha'];
    const litros = row['Litros'] || row['litros'];
    const costo = row['Costo Total'] || row['costo total'] || row['Costo'];
    const faena = row['Faena'] || row['faena'] || '';

    // Get period from Mes column or Fecha
    let period: string | null = null;
    if (mes) {
      period = parsePeriod(mes, new Date().getFullYear());
    } else if (fecha) {
      period = parsePeriod(fecha);
    }

    if (!period) {
      if (mes || fecha) {
        errors.push(`Fila ${index + 2}: No se pudo parsear la fecha`);
      }
      return;
    }

    const litrosNum = typeof litros === 'number' ? litros :
                      parseFloat(String(litros || '0').replace(/[^\d.-]/g, ''));
    
    const costoStr = String(costo || '').replace(/[$.,\s]/g, '');
    const costoNum = parseInt(costoStr) || 0;

    if (!aggregated[period]) {
      aggregated[period] = { litros: 0, costo: 0, faenas: new Set() };
    }
    aggregated[period].litros += litrosNum;
    aggregated[period].costo += costoNum;
    if (faena) aggregated[period].faenas.add(String(faena));
  });

  const parsed: ParsedData[] = Object.entries(aggregated)
    .map(([period, data]) => ({
      period,
      consumo_m3: Math.round(data.litros / 1000 * 100) / 100, // Convert litros to m³
      costo: data.costo || undefined,
      observaciones: data.faenas.size > 0 ? `Faenas: ${Array.from(data.faenas).slice(0, 3).join(', ')}${data.faenas.size > 3 ? '...' : ''}` : undefined
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return { parsed, errors };
}

export default function ImportData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [detectedFormat, setDetectedFormat] = useState<FileFormat | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    setErrors([]);
    setParsedData([]);
    setUploaded(false);
    setDetectedFormat(null);

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setErrors(['Formato no soportado. Por favor usa CSV o XLSX.']);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors(['El archivo excede el tamaño máximo de 10 MB.']);
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

      if (json.length === 0) {
        setErrors(['El archivo está vacío o no tiene datos válidos.']);
        return;
      }

      // Detect format based on headers
      const headers = Object.keys(json[0]);
      const format = detectFormat(headers);
      setDetectedFormat(format);

      let result: { parsed: ParsedData[], errors: string[] };

      if (format === 'esval') {
        result = parseEsvalFormat(json);
      } else if (format === 'powerbi') {
        result = parsePowerBiFormat(json);
      } else {
        // Simple format
        const parsed: ParsedData[] = [];
        const newErrors: string[] = [];

        json.forEach((row, index) => {
          const rawPeriod = row['periodo'] || row['Periodo'] || row['period'] || row['Period'] || row['MES'] || row['Mes'] || '';
          const consumo = Number(row['consumo_m3'] || row['Consumo'] || row['consumo'] || row['m3'] || 0);
          const costo = Number(row['costo'] || row['Costo'] || row['cost'] || 0) || undefined;
          const observaciones = String(row['observaciones'] || row['Observaciones'] || row['notes'] || '') || undefined;

          const period = parsePeriod(rawPeriod);
          if (!period) {
            newErrors.push(`Fila ${index + 2}: Formato de período no reconocido`);
            return;
          }

          if (isNaN(consumo) || consumo <= 0) {
            newErrors.push(`Fila ${index + 2}: Consumo debe ser un número positivo`);
            return;
          }

          parsed.push({ period, consumo_m3: consumo, costo, observaciones });
        });

        result = { parsed, errors: newErrors };
      }

      setErrors(result.errors);
      setParsedData(result.parsed);
      
      if (result.parsed.length > 0) {
        toast({
          title: 'Archivo procesado',
          description: `Formato detectado: ${format === 'esval' ? 'ESVAL Consumo Período' : format === 'powerbi' ? 'Control de Agua (Power BI)' : 'Simple'}`,
        });
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setErrors(['Error al procesar el archivo. Verifica el formato.']);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!user || parsedData.length === 0) return;

    setLoading(true);
    try {
      const dataToInsert = parsedData.map(row => ({
        user_id: user.id,
        period: row.period,
        consumo_m3: row.consumo_m3,
        costo: row.costo,
        observaciones: row.observaciones
      }));

      const { error } = await supabase
        .from('water_readings')
        .upsert(dataToInsert, { onConflict: 'user_id,period' });

      if (error) throw error;

      setUploaded(true);
      toast({
        title: 'Datos importados',
        description: `Se importaron ${parsedData.length} registros correctamente`,
      });
    } catch (error) {
      console.error('Error uploading data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron importar los datos',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      { periodo: '2025-01', consumo_m3: 1200, costo: 45000, observaciones: 'Ejemplo' },
      { periodo: '2025-02', consumo_m3: 1150, costo: 43000, observaciones: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consumos');
    XLSX.writeFile(wb, 'plantilla_consumos.xlsx');
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="Importar Datos" 
        description="Carga archivos CSV o Excel con información de consumo hídrico" 
      />

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="stat-card mb-6"
      >
        <h3 className="font-semibold mb-1">Subir Archivo</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Formatos aceptados: CSV, XLSX (máximo 10 MB)
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }
          `}
        >
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
          <p className="text-sm font-medium">
            Arrastra tu archivo aquí o haz clic para seleccionar
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Soporta: CSV, XLSX
          </p>
        </div>
      </motion.div>

      {/* Templates */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="stat-card mb-6"
      >
        <h3 className="font-semibold mb-4">Plantillas disponibles</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Descarga una plantilla compatible con tu formato de datos. El sistema detecta automáticamente el formato.
        </p>
        
        <div className="grid gap-3 sm:grid-cols-3">
          <a
            href="/templates/plantilla_consumo_periodo.xlsx"
            download
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">Consumo ESVAL</p>
              <p className="text-xs text-muted-foreground">Formato boleta mensual</p>
            </div>
          </a>
          
          <a
            href="/templates/plantilla_control_agua_detallado.xlsx"
            download
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">Control Detallado</p>
              <p className="text-xs text-muted-foreground">Formato Power BI</p>
            </div>
          </a>
          
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">Plantilla Simple</p>
              <p className="text-xs text-muted-foreground">Formato básico</p>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Format detected badge */}
      {detectedFormat && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Formato detectado: {detectedFormat === 'esval' ? 'ESVAL Consumo Período' : detectedFormat === 'powerbi' ? 'Control de Agua (Power BI)' : 'Simple'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card mb-6 border-destructive/50"
        >
          <div className="flex items-center gap-2 text-destructive mb-3">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-semibold">Errores encontrados</h3>
          </div>
          <ul className="space-y-1">
            {errors.map((error, i) => (
              <li key={i} className="text-sm text-destructive">{error}</li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Preview */}
      {parsedData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Vista previa</h3>
              <p className="text-sm text-muted-foreground">
                {parsedData.length} registros listos para importar
              </p>
            </div>
            {uploaded ? (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Importado</span>
              </div>
            ) : (
              <Button onClick={handleUpload} disabled={loading}>
                {loading ? 'Importando...' : 'Confirmar importación'}
              </Button>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Consumo (m³)</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.slice(0, 10).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.period}</TableCell>
                    <TableCell>{row.consumo_m3.toLocaleString()} m³</TableCell>
                    <TableCell>{row.costo ? `$${row.costo.toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{row.observaciones || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {parsedData.length > 10 && (
              <div className="p-3 text-center text-sm text-muted-foreground bg-muted/30">
                +{parsedData.length - 10} registros más
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

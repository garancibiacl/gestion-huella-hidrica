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

export default function ImportData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

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

      const parsed: ParsedData[] = [];
      const newErrors: string[] = [];

      json.forEach((row, index) => {
        const period = String(row['periodo'] || row['Periodo'] || row['period'] || row['Period'] || '');
        const consumo = Number(row['consumo_m3'] || row['Consumo'] || row['consumo'] || row['m3'] || 0);
        const costo = Number(row['costo'] || row['Costo'] || row['cost'] || 0) || undefined;
        const observaciones = String(row['observaciones'] || row['Observaciones'] || row['notes'] || '') || undefined;

        // Validate period format (YYYY-MM)
        const periodRegex = /^\d{4}-\d{2}$/;
        if (!periodRegex.test(period)) {
          newErrors.push(`Fila ${index + 2}: Formato de período inválido. Usa YYYY-MM (ej: 2025-01)`);
          return;
        }

        if (isNaN(consumo) || consumo <= 0) {
          newErrors.push(`Fila ${index + 2}: Consumo debe ser un número positivo`);
          return;
        }

        parsed.push({
          period,
          consumo_m3: consumo,
          costo,
          observaciones
        });
      });

      setErrors(newErrors);
      setParsedData(parsed);
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

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="stat-card mb-6"
      >
        <h3 className="font-semibold mb-4">Instrucciones</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
              1
            </span>
            <div>
              <p className="font-medium text-sm">Descarga la plantilla de ejemplo</p>
              <p className="text-xs text-muted-foreground">Usa el formato correcto para evitar errores</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
              2
            </span>
            <div>
              <p className="font-medium text-sm">Completa los datos de consumo</p>
              <p className="text-xs text-muted-foreground">Incluye período, consumo en m³ y observaciones</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
              3
            </span>
            <div>
              <p className="font-medium text-sm">Sube el archivo y revisa la vista previa</p>
              <p className="text-xs text-muted-foreground">El sistema validará automáticamente los datos</p>
            </div>
          </div>
        </div>
        
        <Button variant="outline" className="mt-4" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Descargar plantilla
        </Button>
      </motion.div>

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

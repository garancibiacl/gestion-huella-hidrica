import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
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
import { PetroleumRowRaw, PetroleumReading } from '@/lib/petroleum/types';
import { mapRowToPetroleumReading } from '@/lib/petroleum/utils';

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getRowValueByHeader(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const candidate of candidates) {
    if (candidate in row) return row[candidate];
  }

  const normalizedCandidates = new Set(candidates.map(normalizeHeader));
  for (const key of Object.keys(row)) {
    if (normalizedCandidates.has(normalizeHeader(key))) {
      return row[key];
    }
  }

  return undefined;
}

function mapJsonRowToPetroleumRowRaw(row: Record<string, unknown>): PetroleumRowRaw {
  return {
    fechaEmision: getRowValueByHeader(row, ['Fecha Emision', 'Fecha Emisión', 'FECHA EMISION', 'FECHA EMISIÓN', 'fecha emision', 'fecha emisión', 'Fecha', 'FECHA']),
    fechaPago: getRowValueByHeader(row, ['Fecha de Pago', 'FECHA DE PAGO', 'fecha de pago', 'Fecha Pago']),
    centroTrabajo: getRowValueByHeader(row, ['Centro de Trabajo', 'CENTRO DE TRABAJO', 'centro de trabajo', 'Centro Trabajo']),
    consumoEnFaenaMinera: getRowValueByHeader(row, ['Consumo en Faena Minera', 'CONSUMO EN FAENA MINERA', 'consumo en faena minera']),
    razonSocial: getRowValueByHeader(row, ['Razon Social', 'Razón Social', 'RAZON SOCIAL', 'RAZÓN SOCIAL', 'razon social', 'razón social']),
    litros: getRowValueByHeader(row, ['Litros', 'LITROS', 'litros']),
    proveedor: getRowValueByHeader(row, ['Proveedor', 'PROVEEDOR', 'proveedor']),
    costoTotal: getRowValueByHeader(row, ['Costo Total', 'COSTO TOTAL', 'costo total', 'Total', 'TOTAL']),
  };
}

export default function ImportPetroleum() {
  const { user } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganization();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<PetroleumReading[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
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
    setRows([]);
    setUploaded(false);

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
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

      const parsedRows: PetroleumReading[] = [];
      const newErrors: string[] = [];

      json.forEach((row, index) => {
        const raw: PetroleumRowRaw = mapJsonRowToPetroleumRowRaw(row);
        try {
          const reading = mapRowToPetroleumReading(raw);
          if (!reading.center || reading.liters <= 0) {
            newErrors.push(`Fila ${index + 2}: Centro de trabajo o litros inválidos`);
            return;
          }
          parsedRows.push(reading);
        } catch (error) {
          console.error('Error mapping petroleum row', error);
          newErrors.push(`Fila ${index + 2}: Error al procesar la fila`);
        }
      });

      setErrors(newErrors);
      setRows(parsedRows);

      if (parsedRows.length > 0) {
        toast({
          title: 'Archivo procesado',
          description: `Registros de petróleo: ${parsedRows.length}`,
        });
      }
    } catch (error) {
      console.error('Error parsing petroleum file:', error);
      setErrors(['Error al procesar el archivo. Verifica el formato.']);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!user || rows.length === 0) return;
    if (orgLoading || !organizationId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo determinar la organización del usuario. Intenta recargar la página.',
      });
      return;
    }

    setLoading(true);
    try {
      const dataToInsert = rows.map((row) => ({
        user_id: user.id,
        organization_id: organizationId,
        period: row.periodKey,
        period_label: row.periodLabel,
        date_emission: row.dateEmission,
        date_payment: row.datePayment,
        center: row.center,
        company: row.company,
        supplier: row.supplier,
        liters: row.liters,
        total_cost: row.totalCost,
        mining_use_raw: row.miningUseRaw,
        is_mining_use: row.isMiningUse,
      }));

      const { error } = await supabase.from('petroleum_consumption').insert(dataToInsert);
      if (error) throw error;

      setUploaded(true);
      toast({
        title: 'Datos importados',
        description: `Se importaron ${rows.length} registros de petróleo`,
      });
    } catch (error: any) {
      console.error('Error uploading petroleum data:', error);
      toast({
        variant: 'destructive',
        title: 'Error al importar',
        description: error?.message || 'No se pudieron importar los datos de petróleo.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar datos de Petróleo"
        description="Sube tu archivo de consumo de petróleo para sincronizarlo con el dashboard y la huella de carbono."
      />

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-6 shadow-sm"
        >
          <div
            className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/60'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileSelect}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium">Arrastra tu archivo aquí o haz clic para seleccionarlo</p>
                <p className="mt-1 text-xs text-muted-foreground">Formatos soportados: XLSX, XLS, CSV</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>
                Columnas esperadas: Fecha Emisión, Fecha de Pago, Centro de Trabajo, Consumo en Faena Minera, Razón Social,
                Litros, Proveedor, Costo Total.
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              {uploaded ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Datos cargados correctamente
                </span>
              ) : rows.length > 0 ? (
                <span className="text-xs text-muted-foreground">Registros listos para importar: {rows.length}</span>
              ) : (
                <span className="text-xs text-muted-foreground">Aún no hay registros procesados</span>
              )}
            </div>

            <Button size="sm" onClick={handleUpload} disabled={loading || rows.length === 0}>
              {loading ? 'Importando...' : 'Importar a Petróleo'}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Vista previa de datos</h2>
            <span className="text-xs text-muted-foreground">
              Se muestran las primeras {Math.min(rows.length, 10)} filas
            </span>
          </div>

          {errors.length > 0 && (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" /> Problemas detectados al procesar el archivo
              </div>
              <ul className="list-inside list-disc space-y-0.5">
                {errors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {errors.length > 5 && <li>Y {errors.length - 5} mensajes más...</li>}
              </ul>
            </div>
          )}

          <div className="max-h-[360px] overflow-auto rounded-md border bg-background">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <TableRow>
                  <TableHead className="whitespace-nowrap">Período</TableHead>
                  <TableHead className="whitespace-nowrap">Fecha Emisión</TableHead>
                  <TableHead className="whitespace-nowrap">Centro</TableHead>
                  <TableHead className="whitespace-nowrap">Razón Social</TableHead>
                  <TableHead className="whitespace-nowrap">Proveedor</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Litros</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Costo Total</TableHead>
                  <TableHead className="whitespace-nowrap">Faena Minera</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 10).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-xs">{row.periodLabel}</TableCell>
                    <TableCell className="text-xs">{row.dateEmission || '-'}</TableCell>
                    <TableCell className="text-xs">{row.center}</TableCell>
                    <TableCell className="text-xs">{row.company}</TableCell>
                    <TableCell className="text-xs">{row.supplier}</TableCell>
                    <TableCell className="text-right text-xs">
                      {row.liters.toLocaleString('es-CL', { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {row.totalCost
                        ? `$${row.totalCost.toLocaleString('es-CL')}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs">{row.miningUseRaw || '-'}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-xs text-muted-foreground">
                      Sube un archivo para ver aquí la vista previa de los datos de petróleo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

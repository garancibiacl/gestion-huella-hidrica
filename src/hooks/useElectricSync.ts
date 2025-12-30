import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// URL pública del Google Sheet de energía (formato CSV)
// Importante: usar /export?format=csv&gid=... (no /edit) para asegurar datos consistentes.
const CSV_URL = 'https://docs.google.com/spreadsheets/d/18Chw9GKYlblBOljJ7ZGJ0aJBYQU7t1Ax/export?format=csv&gid=23328836';
const LAST_SYNC_KEY = 'last_electric_sync';
const LAST_HASH_KEY = 'last_electric_hash';
const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface ElectricSyncResult {
  success: boolean;
  rowsInserted: number;
  errors: string[];
}

interface UseElectricSyncOptions {
  enabled?: boolean;
  onSyncStart?: () => void;
  onSyncComplete?: (success: boolean, rowsInserted: number, errors: string[]) => void;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function parseChileanCurrency(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[$\s.]/g, '').replace(/,/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function parseChileanNumber(value: string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Si tiene coma, es formato chileno/europeo (1.234,56 o 1234,56)
  if (raw.includes(',')) {
    const normalized = raw.replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
  }

  // Si tiene punto, determinar si es separador de miles o decimal
  if (raw.includes('.')) {
    const parts = raw.split('.');
    // Si hay exactamente 3 dígitos después del punto, es separador de miles (78.996 = 78996)
    if (parts.length === 2 && parts[1].length === 3) {
      const normalized = raw.replace(/\./g, '');
      const num = parseInt(normalized, 10);
      console.log(`parseChileanNumber: "${raw}" → ${num} (miles)`);
      return isNaN(num) ? null : num;
    }
    // Si hay múltiples puntos, son todos separadores de miles (1.234.567)
    if (parts.length > 2) {
      const normalized = raw.replace(/\./g, '');
      const num = parseInt(normalized, 10);
      return isNaN(num) ? null : num;
    }
  }

  const num = parseFloat(raw);
  return isNaN(num) ? null : num;
}

function parsePeriod(rawValue: string | undefined): string | null {
  if (!rawValue) return null;
  // Normalizar: quitar guiones/slashes múltiples consecutivos
  const value = String(rawValue).trim().replace(/[-/]+/g, '-');

  if (/^\d{4}-\d{2}$/.test(value)) return value;

  // Fechas tipo 24-01-2025 o 24/01/2025
  const dateMatch = value.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (dateMatch) {
    const monthNum = parseInt(dateMatch[2], 10);
    const yearNum = parseInt(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3], 10);
    if (!isNaN(monthNum) && !isNaN(yearNum) && monthNum >= 1 && monthNum <= 12) {
      return `${yearNum}-${monthNum.toString().padStart(2, '0')}`;
    }
  }

  const monthMap: Record<string, string> = {
    enero: '01', ene: '01',
    febrero: '02', feb: '02',
    marzo: '03', mar: '03',
    abril: '04', abr: '04',
    mayo: '05', may: '05',
    junio: '06', jun: '06',
    julio: '07', jul: '07',
    agosto: '08', ago: '08',
    septiembre: '09', sep: '09',
    octubre: '10', oct: '10',
    noviembre: '11', nov: '11',
    diciembre: '12', dic: '12',
  };

  const normalized = value.toLowerCase().replace(/[^a-záéíóú0-9]/g, ' ').trim();
  const parts = normalized.split(/\s+/);
  let month: string | null = null;
  for (const p of parts) {
    if (monthMap[p]) {
      month = monthMap[p];
      break;
    }
  }
  if (!month) return null;

  const yearMatch = value.match(/\d{4}/);
  if (!yearMatch) return null;
  return `${yearMatch[0]}-${month}`;
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      if (char === '\r') i++;
    } else if (char !== '\r') {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

async function performElectricSync(userId: string, force: boolean = false): Promise<ElectricSyncResult> {
  const errors: string[] = [];
  
  try {
    // Get organization_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    const organizationId = profileData?.organization_id;
    if (!organizationId) {
      return { success: false, rowsInserted: 0, errors: ['No se pudo determinar la organización del usuario.'] };
    }

    const fetchUrl = force
      ? `${CSV_URL}${CSV_URL.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`
      : CSV_URL;

    console.log('Fetching electric CSV from:', fetchUrl);
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      return {
        success: false,
        rowsInserted: 0,
        errors: [`Error fetching Google Sheet: ${response.status} ${response.statusText}`],
      };
    }

    const csvText = await response.text();
    console.log('CSV first 300 chars:', csvText.substring(0, 300));

    const currentHash = simpleHash(csvText);
    const lastHash = localStorage.getItem(LAST_HASH_KEY);

    if (!force && lastHash === currentHash) {
      console.log('Electric sheet content unchanged, skipping sync.');
      return { success: true, rowsInserted: 0, errors: [] };
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return { success: true, rowsInserted: 0, errors: [] };
    }

    const headers = rows[0].map(h => h.trim());
    const normalizedHeaders = headers.map(normalizeHeader);
    console.log('Headers:', headers);
    console.log('Normalized:', normalizedHeaders);

    const dataRows = rows.slice(1);
    const records: any[] = [];

    dataRows.forEach((row, i) => {
      const rowObj: Record<string, string> = {};
      normalizedHeaders.forEach((nh, idx) => {
        rowObj[nh] = row[idx] || '';
      });

      // Map columns flexibly
      const fecha = rowObj['fecha'] || '';
      const centroTrabajo = rowObj['centro trabajo'] || rowObj['centro de trabajo'] || '';
      const direccion = (rowObj['direccion'] || rowObj['dirección'] || '').trim();
      const medidor = rowObj['n medidor'] || rowObj['n de medidor'] || rowObj['medidor'] || rowObj['numero medidor'] || '';
      const consumo = rowObj['m3 consumidos por periodo'] || rowObj['consumo kwh'] || rowObj['consumo'] || '';
      const costoTotal = rowObj['total pagar'] || rowObj['costo pagar'] || rowObj['costo total'] || '';
      const tipoUso = rowObj['tipo'] || rowObj['tipo medidor uso'] || '';
      const proveedor = rowObj['proveedor'] || '';

      console.log(`Row ${i + 2}: fecha="${fecha}", centro="${centroTrabajo}", consumo="${consumo}"`);

      if (!centroTrabajo && !consumo) {
        console.log(`Row ${i + 2}: Skipped - no centroTrabajo and no consumo`);
        return;
      }

      const period = parsePeriod(fecha);
      if (!period) {
        errors.push(`Fila ${i + 2}: No se pudo parsear período de "${fecha}"`);
        console.log(`Row ${i + 2}: Skipped - invalid period`);
        return;
      }

      const consumoNum = parseChileanNumber(consumo) ?? 0;
      const costoNum = parseChileanCurrency(costoTotal);
      
      // Permitir consumo = 0 si hay costo (factura sin lectura de consumo)
      if (consumoNum < 0 || (consumoNum === 0 && !costoNum)) {
        errors.push(`Fila ${i + 2}: Consumo inválido "${consumo}" y sin costo`);
        console.log(`Row ${i + 2}: Skipped - invalid consumo and no cost`);
        return;
      }

      records.push({
        user_id: userId,
        organization_id: organizationId,
        period,
        centro_trabajo: centroTrabajo || 'Sin especificar',
        medidor: medidor || direccion || 'Sin medidor',
        consumo_kwh: consumoNum,
        costo_total: costoNum,
        tipo_uso: tipoUso || null,
        proveedor: proveedor || null,
      });
    });

    console.log('Records to insert:', records.length);

    if (records.length > 0) {
      // Mirror sync: delete all for this org and re-insert
      const { error: deleteError } = await supabase
        .from('electric_meter_readings')
        .delete()
        .eq('organization_id', organizationId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return { success: false, rowsInserted: 0, errors: [deleteError.message] };
      }

      const { error: insertError } = await supabase
        .from('electric_meter_readings')
        .insert(records);

      if (insertError) {
        console.error('Insert error:', insertError);
        return { success: false, rowsInserted: 0, errors: [insertError.message] };
      }
    }

    // Marcar caché SOLO si la sincronización fue exitosa
    localStorage.setItem(LAST_HASH_KEY, currentHash);
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    return { success: true, rowsInserted: records.length, errors };
  } catch (error) {
    console.error('Electric sync error:', error);
    return { success: false, rowsInserted: 0, errors: [(error as Error).message] };
  }
}

export function useElectricSync(options: UseElectricSyncOptions = {}) {
  const { enabled = true, onSyncStart, onSyncComplete } = options;
  const { user } = useAuth();
  const syncInProgress = useRef(false);
  const hasInitialSynced = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const shouldSync = useCallback(() => {
    if (!enabled || !user?.id) return false;
    const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);
    if (!lastSyncStr) return true;
    const lastSync = parseInt(lastSyncStr, 10);
    return Date.now() - lastSync >= MIN_SYNC_INTERVAL;
  }, [enabled, user?.id]);

  const syncElectric = useCallback(async (force = false) => {
    if (!user?.id || syncInProgress.current) return;

    if (!force && !shouldSync()) {
      console.log('Electric sync skipped - within interval');
      return;
    }

    syncInProgress.current = true;
    setIsSyncing(true);
    onSyncStart?.();

    const result = await performElectricSync(user.id, force);

    syncInProgress.current = false;
    setIsSyncing(false);
    setLastSyncAt(Date.now());

    onSyncComplete?.(result.success, result.rowsInserted, result.errors);

    return result;
  }, [user?.id, shouldSync, onSyncStart, onSyncComplete]);

  // Auto-sync disabled to prevent duplicate data on page reload
  // Users must click "Sincronizar Energía" button manually
  // useEffect(() => {
  //   if (enabled && user?.id && !hasInitialSynced.current) {
  //     hasInitialSynced.current = true;
  //     syncElectric(true);
  //   }
  // }, [enabled, user?.id, syncElectric]);
  return { syncElectric, isSyncing, lastSyncAt };
}

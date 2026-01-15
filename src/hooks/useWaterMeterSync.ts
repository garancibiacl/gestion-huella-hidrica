import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// URL pública del Google Sheet de agua medidor (publicado).
const SHEET_PUBHTML_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQc5dC1jLM23N7CrgGIdFsksqL67FrNrbCLff2wuW5PQvvVb3nW5FW_QtBhEuG_FrRSe8mSqOKhyEtC/pubhtml';
const LAST_SYNC_KEY = 'last_water_meter_sync';
const LAST_HASH_KEY = 'last_water_meter_hash';
const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface WaterMeterSyncResult {
  success: boolean;
  rowsInserted: number;
  errors: string[];
}

interface UseWaterMeterSyncOptions {
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
  const raw = String(value).trim();
  if (!raw) return null;
  const withoutCurrency = raw.replace(/[$\s]/g, '');
  const noDecimals = withoutCurrency.includes(',')
    ? withoutCurrency.split(',')[0]
    : withoutCurrency;
  const normalized = noDecimals.replace(/\./g, '');
  const num = parseInt(normalized, 10);
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

function toCsvUrlFromPublishedSheet(publishedUrl: string): string {
  if (publishedUrl.includes('/edit')) {
    const [base] = publishedUrl.split('/edit');
    return `${base}/export?format=csv`;
  }
  if (publishedUrl.includes('/pubhtml')) {
    const [base, query] = publishedUrl.split('?');
    const pubBase = base.replace('/pubhtml', '/pub');
    return query ? `${pubBase}?output=csv&${query}` : `${pubBase}?output=csv`;
  }
  if (publishedUrl.includes('output=csv')) return publishedUrl;
  return publishedUrl.includes('?') ? `${publishedUrl}&output=csv` : `${publishedUrl}?output=csv`;
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

async function performWaterMeterSync(userId: string, force: boolean = false): Promise<WaterMeterSyncResult> {
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

    const csvUrl = toCsvUrlFromPublishedSheet(SHEET_PUBHTML_URL);
    const fetchUrl = force
      ? `${csvUrl}${csvUrl.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`
      : csvUrl;

    console.log('Fetching water meter CSV from:', fetchUrl);
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
      console.log('Water meter sheet content unchanged, skipping sync.');
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
    const seenKeys = new Set<string>();
    const records: any[] = [];

    dataRows.forEach((row, i) => {
      const rowObj: Record<string, string> = {};
      normalizedHeaders.forEach((nh, idx) => {
        rowObj[nh] = row[idx] || '';
      });

      // Map columns flexibly - same format as electric
      const fecha = rowObj['fecha'] || '';
      const centroTrabajo = rowObj['centro trabajo'] || rowObj['centro de trabajo'] || '';
      const direccion = rowObj['direccion'] || '';
      const medidor =
        rowObj['n medidor'] ||
        rowObj['n de medidor'] ||
        rowObj['n de medidor '] ||
        rowObj['n° de medidor'] ||
        rowObj['nº de medidor'] ||
        rowObj['n de medidor'] ||
        rowObj['medidor'] ||
        rowObj['numero medidor'] ||
        '';
      const lecturaM3 = rowObj['lectura en m3'] || rowObj['lectura m3'] || '';
      const consumoM3 =
        rowObj['m3 consumidos por periodo'] ||
        rowObj['m3 consumidos por periodo '] ||
        rowObj['m3 consumidos por periodo.'] ||
        rowObj['m3 consumidos por periodo'] ||
        rowObj['consumo m3'] ||
        rowObj['consumo'] ||
        '';
      const sobreConsumoM3 =
        rowObj['sobre consumo en m3'] ||
        rowObj['sobre consumo en m3 '] ||
        rowObj['sobre consumo'] ||
        '';
      const costoTotal =
        rowObj['total pagar'] ||
        rowObj['total a pagar'] ||
        rowObj['total'] ||
        rowObj['costo pagar'] ||
        rowObj['costo total'] ||
        '';
      const observaciones = rowObj['observaciones'] || '';

      console.log(`Row ${i + 2}: fecha="${fecha}", centro="${centroTrabajo}", consumo="${consumoM3}"`);

      if (!centroTrabajo && !consumoM3) {
        console.log(`Row ${i + 2}: Skipped - no centroTrabajo and no consumo`);
        return;
      }

      const period = parsePeriod(fecha);
      if (!period) {
        errors.push(`Fila ${i + 2}: No se pudo parsear período de "${fecha}"`);
        console.log(`Row ${i + 2}: Skipped - invalid period`);
        return;
      }

      const consumoNum = parseChileanNumber(consumoM3) ?? 0;
      const costoNum = parseChileanCurrency(costoTotal);

      // Permitir consumo = 0 si hay costo (factura sin lectura de consumo)
      if (consumoNum < 0 || (consumoNum === 0 && !costoNum)) {
        errors.push(`Fila ${i + 2}: Consumo inválido "${consumoM3}" y sin costo`);
        console.log(`Row ${i + 2}: Skipped - invalid consumo and no cost`);
        return;
      }

      const dedupeKey = `${period}|${centroTrabajo}|${medidor}|${lecturaM3}|${consumoM3}|${costoTotal}`;
      if (seenKeys.has(dedupeKey)) return;
      seenKeys.add(dedupeKey);

      records.push({
        user_id: userId,
        organization_id: organizationId,
        period,
        centro_trabajo: centroTrabajo || 'Sin especificar',
        direccion: direccion || null,
        medidor: medidor || 'Sin medidor',
        lectura_m3: parseChileanNumber(lecturaM3) ?? 0,
        consumo_m3: consumoNum,
        sobre_consumo_m3: parseChileanNumber(sobreConsumoM3) ?? 0,
        costo_total: costoNum,
        observaciones: observaciones || null,
      });
    });

    console.log('Records to insert:', records.length);
    if (records.length > 0) {
      const totalCostFromCsv = records.reduce(
        (sum, record) => sum + (typeof record.costo_total === 'number' ? record.costo_total : 0),
        0
      );
      console.log('CSV total costo_total:', totalCostFromCsv);
    }

    if (records.length > 0) {
      // Mirror sync: delete all for this org and re-insert
      const { error: deleteError } = await supabase
        .from('water_meter_readings')
        .delete()
        .eq('organization_id', organizationId);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        return { success: false, rowsInserted: 0, errors: [deleteError.message] };
      }

      const { error: insertError } = await supabase
        .from('water_meter_readings')
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
    console.error('Water meter sync error:', error);
    return { success: false, rowsInserted: 0, errors: [(error as Error).message] };
  }
}

export function useWaterMeterSync(options: UseWaterMeterSyncOptions = {}) {
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

  const syncWaterMeter = useCallback(async (force = false) => {
    if (!user?.id || syncInProgress.current) return { success: false, rowsInserted: 0, errors: ['Sync in progress'] };

    if (!force && !shouldSync()) {
      console.log('Water meter sync skipped - within interval');
      return { success: true, rowsInserted: 0, errors: [] };
    }

    syncInProgress.current = true;
    setIsSyncing(true);
    onSyncStart?.();

    const result = await performWaterMeterSync(user.id, force);

    syncInProgress.current = false;
    setIsSyncing(false);
    setLastSyncAt(Date.now());

    onSyncComplete?.(result.success, result.rowsInserted, result.errors);

    return result;
  }, [user?.id, shouldSync, onSyncStart, onSyncComplete]);

  // Auto-sync on mount
  useEffect(() => {
    if (enabled && user?.id && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      syncWaterMeter(true);
    }
  }, [enabled, user?.id, syncWaterMeter]);

  return { syncWaterMeter, isSyncing, lastSyncAt };
}

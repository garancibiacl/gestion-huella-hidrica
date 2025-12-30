import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// URL pública del Google Sheet de agua medidor (formato CSV) - Hoja1
const CSV_URL = 'https://docs.google.com/spreadsheets/d/1yVo_zxvA-hSf04aUXABijRUeAuHq-huc/export?format=csv&gid=0';
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
    // Si hay exactamente 3 dígitos después del punto, es separador de miles
    if (parts.length === 2 && parts[1].length === 3) {
      const normalized = raw.replace(/\./g, '');
      const num = parseInt(normalized, 10);
      return isNaN(num) ? null : num;
    }
    // Si hay múltiples puntos, son todos separadores de miles
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
  const value = String(rawValue).trim().replace(/[-/]+/g, '-');

  if (/^\d{4}-\d{2}$/.test(value)) return value;

  // Fechas tipo 24-01-2025 o 24/01/2025
  const dateMatch = value.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    let year = parseInt(dateMatch[3], 10);
    if (year < 100) year += 2000;

    if (day > 12 && month <= 12) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    if (month > 12 && day <= 12) {
      return `${year}-${String(day).padStart(2, '0')}`;
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  return null;
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

async function performWaterMeterSync(userId: string, organizationId: string, force: boolean = false): Promise<WaterMeterSyncResult> {
  const errors: string[] = [];

  try {
    const fetchUrl = force
      ? `${CSV_URL}${CSV_URL.includes('?') ? '&' : '?'}cacheBust=${Date.now()}`
      : CSV_URL;

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
      console.log('Water meter sheet unchanged, skipping sync.');
      return { success: true, rowsInserted: 0, errors: [] };
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return { success: true, rowsInserted: 0, errors: [] };
    }

    const headers = rows[0];
    console.log('Headers:', headers);

    const normalizedHeaders = headers.map(h => 
      h.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
    );
    console.log('Normalized:', normalizedHeaders);

    const dataRows = rows.slice(1);
    const records: any[] = [];

    dataRows.forEach((row, i) => {
      const rowObj: Record<string, string> = {};
      normalizedHeaders.forEach((nh, idx) => {
        rowObj[nh] = row[idx] || '';
      });

      // Map columns flexibly based on the sheet structure
      const fecha = rowObj['fecha'] || '';
      const centroTrabajo = rowObj['centro de trabajo'] || rowObj['centro trabajo'] || '';
      const direccion = rowObj['direccion'] || '';
      const medidor = rowObj['n de medidor'] || rowObj['no de medidor'] || rowObj['medidor'] || rowObj['numero medidor'] || '';
      const lecturaM3 = rowObj['lectura en m3'] || rowObj['lectura m3'] || '';
      const consumoM3 = rowObj['m3 consumidos por periodo'] || rowObj['consumo m3'] || rowObj['consumo'] || '';
      const sobreConsumoM3 = rowObj['sobre consumo en m3'] || rowObj['sobre consumo'] || '';
      const costoTotal = rowObj['total pagar'] || rowObj['total a pagar'] || rowObj['costo total'] || '';
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
      
      // Permitir consumo = 0 si hay costo
      if (consumoNum < 0 || (consumoNum === 0 && !costoNum)) {
        errors.push(`Fila ${i + 2}: Consumo inválido "${consumoM3}" y sin costo`);
        console.log(`Row ${i + 2}: Skipped - invalid consumo and no cost`);
        return;
      }

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const hasInitialSynced = useRef(false);

  const shouldSync = useCallback((force: boolean = false): boolean => {
    if (force) return true;
    const lastSync = localStorage.getItem(LAST_SYNC_KEY);
    if (!lastSync) return true;
    const elapsed = Date.now() - parseInt(lastSync, 10);
    return elapsed > MIN_SYNC_INTERVAL;
  }, []);

  const syncWaterMeter = useCallback(async (force: boolean = false): Promise<WaterMeterSyncResult> => {
    if (!user?.id) {
      return { success: false, rowsInserted: 0, errors: ['Usuario no autenticado'] };
    }

    if (isSyncing) {
      return { success: false, rowsInserted: 0, errors: ['Sincronización en progreso'] };
    }

    if (!shouldSync(force)) {
      console.log('Water meter sync skipped - too soon');
      return { success: true, rowsInserted: 0, errors: [] };
    }

    setIsSyncing(true);
    onSyncStart?.();

    try {
      // Get organization_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const organizationId = profileData?.organization_id;
      if (!organizationId) {
        const result = { success: false, rowsInserted: 0, errors: ['No se pudo determinar la organización del usuario.'] };
        onSyncComplete?.(false, 0, result.errors);
        return result;
      }

      const result = await performWaterMeterSync(user.id, organizationId, force);
      
      if (result.success) {
        setLastSyncAt(Date.now());
      }
      
      onSyncComplete?.(result.success, result.rowsInserted, result.errors);
      return result;
    } catch (error) {
      const result = { success: false, rowsInserted: 0, errors: [(error as Error).message] };
      onSyncComplete?.(false, 0, result.errors);
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, isSyncing, shouldSync, onSyncStart, onSyncComplete]);

  return { syncWaterMeter, isSyncing, lastSyncAt };
}

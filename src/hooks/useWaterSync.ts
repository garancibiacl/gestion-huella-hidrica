import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/1yVo_zxvA-hSf04aUXABijRUeAuHq-huc/export?format=csv&gid=0';
const LAST_SYNC_KEY = 'last_water_sync';
const LAST_HASH_KEY = 'last_water_hash';
const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface WaterSyncResult {
  success: boolean;
  rowsProcessed: number;
  errors?: string[];
}

interface UseWaterSyncOptions {
  enabled?: boolean;
  onSyncStart?: () => void;
  onSyncComplete?: (success: boolean, rowsProcessed: number) => void;
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

function parsePeriod(rawValue: string | undefined, fallbackYear?: number): string | null {
  if (!rawValue) return null;
  const value = String(rawValue).trim();

  if (/^\d{4}-\d{2}$/.test(value)) return value;

  const monthMap: Record<string, string> = {
    enero: '01', ene: '01',
    febrero: '02', feb: '02',
    marzo: '03', mar: '03',
    abril: '04', abr: '04',
    mayo: '05', may: '05',
    junio: '06', jun: '06',
    julio: '07', jul: '07',
    agosto: '08', ago: '08',
    septiembre: '09', sep: '09', sept: '09',
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
  const year = yearMatch ? yearMatch[0] : (fallbackYear ? String(fallbackYear) : null);
  if (!year) return null;

  return `${year}-${month}`;
}

function extractYearFromDate(fecha: string | undefined): number | undefined {
  if (!fecha) return undefined;
  const match = String(fecha).match(/\d{4}/);
  return match ? parseInt(match[0], 10) : undefined;
}

function convertToISODate(fecha: string | undefined): string | null {
  if (!fecha) return null;
  const value = String(fecha).trim();
  
  const ddmmyyyy = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  const yyyymmdd = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

async function performWaterSync(userId: string, force: boolean = false): Promise<WaterSyncResult> {
  try {
    // Get organization_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    const organizationId = profileData?.organization_id;
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización del usuario para sincronizar.');
    }

    const response = await fetch(CSV_URL);
    if (!response.ok) {
      return { success: false, rowsProcessed: 0, errors: ['Error fetching Google Sheet'] };
    }

    const csvText = await response.text();
    const currentHash = simpleHash(csvText);
    const lastHash = localStorage.getItem(LAST_HASH_KEY);

    if (!force && lastHash === currentHash) {
      console.log('Water sheet content unchanged, skipping sync.');
      return { success: true, rowsProcessed: 0 };
    }

    localStorage.setItem(LAST_HASH_KEY, currentHash);
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return { success: true, rowsProcessed: 0 };
    }

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    const colIdx = {
      fecha: headers.findIndex(h => h.includes('fecha')),
      mes: headers.findIndex(h => h.includes('mes') || h.includes('periodo') || h.includes('período')),
      centroTrabajo: headers.findIndex(h => h.includes('centro')),
      faena: headers.findIndex(h => h.includes('faena')),
      tipo: headers.findIndex(h => h.includes('tipo') || h.includes('formato') || h.includes('producto')),
      proveedor: headers.findIndex(h => h.includes('proveedor')),
      cantidad: headers.findIndex(h => h.includes('cantidad')),
      costoTotal: headers.findIndex(h => h.includes('costo')),
    };

    const records: any[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      const fecha = colIdx.fecha >= 0 ? row[colIdx.fecha] : undefined;
      const mes = colIdx.mes >= 0 ? row[colIdx.mes] : undefined;
      const centroTrabajo = colIdx.centroTrabajo >= 0 ? row[colIdx.centroTrabajo]?.trim() : '';
      const faena = colIdx.faena >= 0 ? row[colIdx.faena]?.trim() : '';
      const tipo = colIdx.tipo >= 0 ? row[colIdx.tipo]?.toLowerCase() : '';
      const proveedor = colIdx.proveedor >= 0 ? row[colIdx.proveedor]?.trim() : '';
      const cantidad = colIdx.cantidad >= 0 ? row[colIdx.cantidad] : '0';
      const costoTotal = colIdx.costoTotal >= 0 ? row[colIdx.costoTotal] : undefined;

      if (!centroTrabajo && !cantidad) continue;

      const yearFromDate = extractYearFromDate(fecha);
      let period = parsePeriod(mes, yearFromDate);
      if (!period && fecha) {
        period = parsePeriod(fecha);
      }

      if (!period || !centroTrabajo) continue;

      const normalizedTipo = String(tipo || '').toLowerCase();
      const isBidon =
        normalizedTipo.includes('bidón') ||
        normalizedTipo.includes('bidon') ||
        normalizedTipo.includes('20l') ||
        normalizedTipo.includes('20 l') ||
        normalizedTipo.includes('garraf');

      const formato = isBidon ? 'bidon_20l' : 'botella';

      const cantidadNum = parseFloat(String(cantidad).replace(/,/g, ''));
      if (isNaN(cantidadNum) || cantidadNum <= 0) continue;

      records.push({
        user_id: userId,
        organization_id: organizationId,
        period,
        fecha: convertToISODate(fecha),
        centro_trabajo: centroTrabajo,
        faena: faena || null,
        formato,
        proveedor: proveedor || null,
        cantidad: cantidadNum,
        unidad: 'unidad',
        precio_unitario: null,
        total_costo: parseChileanCurrency(costoTotal),
      });
    }

    if (records.length > 0) {
      // Mirror sync: delete all and re-insert
      const { data: existingRecords } = await supabase
        .from('human_water_consumption')
        .select('id');

      if (existingRecords && existingRecords.length > 0) {
        const idsToDelete = existingRecords.map(r => r.id);
        for (let i = 0; i < idsToDelete.length; i += 100) {
          const batch = idsToDelete.slice(i, i + 100);
          const { error: deleteError } = await supabase
            .from('human_water_consumption')
            .delete()
            .in('id', batch);

          if (deleteError) throw deleteError;
        }
      }

      const { error: insertError } = await supabase
        .from('human_water_consumption')
        .insert(records);

      if (insertError) throw insertError;
    }

    return { success: true, rowsProcessed: records.length };
  } catch (error) {
    console.error('Water sync error:', error);
    return { success: false, rowsProcessed: 0, errors: [(error as Error).message] };
  }
}

export function useWaterSync(options: UseWaterSyncOptions = {}) {
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

  const sync = useCallback(async (force = false) => {
    if (!user?.id || syncInProgress.current) return;

    if (!force && !shouldSync()) return;

    syncInProgress.current = true;
    setIsSyncing(true);
    onSyncStart?.();

    const result = await performWaterSync(user.id, force);

    syncInProgress.current = false;
    setIsSyncing(false);
    setLastSyncAt(Date.now());
    onSyncComplete?.(result.success, result.rowsProcessed);

    return result;
  }, [user?.id, shouldSync, onSyncStart, onSyncComplete]);

  // Auto-sync on mount
  useEffect(() => {
    if (enabled && user?.id && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      sync(true);
    }
  }, [enabled, user?.id, sync]);

  return { sync, isSyncing, lastSyncAt };
}

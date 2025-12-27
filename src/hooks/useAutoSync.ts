import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SPREADSHEET_ID = '1L78_TmjdE58596F9tqHFK7DTjovedFJI';
const SHEET_GID = '680818774';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

// Minimum time between syncs (5 minutes)
const MIN_SYNC_INTERVAL = 5 * 60 * 1000;
const LAST_SYNC_KEY = 'last_google_sheets_sync';

interface AutoSyncOptions {
  enabled?: boolean;
  onSyncStart?: () => void;
  onSyncComplete?: (success: boolean, rowsProcessed: number) => void;
  userId?: string;
}

// Parse Chilean currency format
function parseChileanCurrency(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[$\s.]/g, '').replace(/,/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

// Parse period to YYYY-MM format
function parsePeriod(rawValue: string | undefined, year?: number): string | null {
  if (!rawValue) return null;
  
  const monthMap: Record<string, string> = {
    'enero': '01', 'ene': '01',
    'febrero': '02', 'feb': '02',
    'marzo': '03', 'mar': '03',
    'abril': '04', 'abr': '04',
    'mayo': '05', 'may': '05',
    'junio': '06', 'jun': '06',
    'julio': '07', 'jul': '07',
    'agosto': '08', 'ago': '08',
    'septiembre': '09', 'sep': '09', 'sept': '09',
    'octubre': '10', 'oct': '10',
    'noviembre': '11', 'nov': '11',
    'diciembre': '12', 'dic': '12',
  };

  const period = String(rawValue).trim();
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  
  const slashMatch = period.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    return `${slashMatch[2]}-${month}`;
  }
  
  const normalized = period.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').trim();
  const parts = normalized.split(/\s+/);
  
  for (const part of parts) {
    if (monthMap[part]) {
      const yearMatch = period.match(/\d{4}/) || period.match(/\d{2}$/);
      if (yearMatch) {
        let yr = yearMatch[0];
        if (yr.length === 2) {
          yr = parseInt(yr) < 50 ? `20${yr}` : `19${yr}`;
        }
        return `${yr}-${monthMap[part]}`;
      } else if (year) {
        return `${year}-${monthMap[part]}`;
      }
    }
  }
  
  return null;
}

function extractYearFromDate(rawDate: string | undefined): number | undefined {
  if (!rawDate) return undefined;
  const parts = String(rawDate).split(/[/\-\.]/);
  if (parts.length >= 3) {
    let year = parseInt(parts[2], 10);
    if (year < 100) year = year < 50 ? 2000 + year : 1900 + year;
    if (year >= 2000 && year <= 2100) return year;
  }
  return undefined;
}

function convertToISODate(rawDate: string | undefined): string | null {
  if (!rawDate) return null;
  const parts = String(rawDate).trim().split(/[/\-\.]/);
  if (parts.length !== 3) return null;
  
  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }
  
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let currentRow: string[] = [];

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      currentRow.push(current.trim());
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current || currentRow.length > 0) {
        currentRow.push(current.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        current = '';
      }
    } else {
      current += char;
    }
  }
  
  if (current || currentRow.length > 0) {
    currentRow.push(current.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

async function performSync(userId: string): Promise<{ success: boolean; rowsProcessed: number }> {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Error fetching sheet: ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return { success: true, rowsProcessed: 0 };
    }

    const headers = rows[0].map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    const colIdx = {
      fecha: headers.findIndex(h => h.includes('fecha')),
      mes: headers.findIndex(h => h === 'mes'),
      centroTrabajo: headers.findIndex(h => h.includes('centro')),
      faena: headers.findIndex(h => h.includes('faena')),
      tipo: headers.findIndex(h => h === 'tipo'),
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

      const formato = (tipo.includes('bidón') || tipo.includes('bidon') || tipo.includes('20')) 
        ? 'bidon_20l' 
        : 'botella';

      const cantidadNum = parseFloat(String(cantidad).replace(/,/g, ''));
      if (isNaN(cantidadNum) || cantidadNum <= 0) continue;

      records.push({
        user_id: userId,
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
      const periods = [...new Set(records.map(r => r.period))];
      
      for (const period of periods) {
        await supabase
          .from('human_water_consumption')
          .delete()
          .eq('user_id', userId)
          .eq('period', period);
      }

      const { error: insertError } = await supabase
        .from('human_water_consumption')
        .insert(records);

      if (insertError) {
        throw insertError;
      }
    }

    // Update last sync timestamp
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    return { success: true, rowsProcessed: records.length };
  } catch (error) {
    console.error('Auto-sync error:', error);
    return { success: false, rowsProcessed: 0 };
  }
}

export function useAutoSync(options: AutoSyncOptions = {}) {
  const { enabled = true, onSyncStart, onSyncComplete, userId } = options;
  const syncInProgress = useRef(false);
  const hasInitialSynced = useRef(false);

  const shouldSync = useCallback(() => {
    if (!enabled || !userId) return false;
    
    const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);
    if (!lastSyncStr) return true;
    
    const lastSync = parseInt(lastSyncStr, 10);
    const timeSinceLastSync = Date.now() - lastSync;
    
    return timeSinceLastSync >= MIN_SYNC_INTERVAL;
  }, [enabled, userId]);

  const sync = useCallback(async (force = false) => {
    if (!userId || syncInProgress.current) return;
    
    if (!force && !shouldSync()) {
      return;
    }

    syncInProgress.current = true;
    
    if (onSyncStart) {
      onSyncStart();
    }

    const result = await performSync(userId);

    syncInProgress.current = false;

    if (onSyncComplete) {
      onSyncComplete(result.success, result.rowsProcessed);
    }
  }, [userId, shouldSync, onSyncStart, onSyncComplete]);

  // Auto-sync on mount (always sync on first load, bypassing interval check)
  useEffect(() => {
    if (enabled && userId && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      // Force sync on first mount
      sync(true);
    }
  }, [enabled, userId, sync]);

  // Auto-sync when window regains focus
  useEffect(() => {
    if (!enabled || !userId) return;

    const handleFocus = () => {
      sync();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [enabled, userId, sync]);

  return { sync };
}

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SPREADSHEET_ID = '1L78_TmjdE58596F9tqHFK7DTjovedFJI';
const SHEET_GID = '680818774';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

// Minimum time between syncs (5 minutes)
const MIN_SYNC_INTERVAL = 5 * 60 * 1000;
const LAST_SYNC_KEY = 'last_google_sheets_sync';
const LAST_HASH_KEY = 'last_google_sheets_hash';
const SYNC_LOCK_KEY = 'google_sheets_sync_in_progress';

// Simple hash function for change detection
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

// Global lock to prevent simultaneous syncs
function acquireSyncLock(): boolean {
  const lockTime = localStorage.getItem(SYNC_LOCK_KEY);
  if (lockTime) {
    // If lock is older than 30 seconds, consider it stale
    const elapsed = Date.now() - parseInt(lockTime, 10);
    if (elapsed < 30000) {
      console.log('Sync already in progress, skipping...');
      return false;
    }
  }
  localStorage.setItem(SYNC_LOCK_KEY, Date.now().toString());
  return true;
}

function releaseSyncLock(): void {
  localStorage.removeItem(SYNC_LOCK_KEY);
}

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
    'enero': '01', 'ene': '01', 'en': '01', 'january': '01', 'jan': '01',
    'febrero': '02', 'feb': '02', 'fe': '02', 'february': '02',
    'marzo': '03', 'mar': '03', 'march': '03',
    'abril': '04', 'abr': '04', 'ab': '04', 'april': '04', 'apr': '04',
    'mayo': '05', 'may': '05',
    'junio': '06', 'jun': '06', 'june': '06',
    'julio': '07', 'jul': '07', 'july': '07',
    'agosto': '08', 'ago': '08', 'ag': '08', 'august': '08', 'aug': '08',
    'septiembre': '09', 'sep': '09', 'sept': '09', 'september': '09',
    'octubre': '10', 'oct': '10', 'oc': '10', 'october': '10',
    'noviembre': '11', 'nov': '11', 'no': '11', 'november': '11',
    'diciembre': '12', 'dic': '12', 'di': '12', 'december': '12', 'dec': '12',
  };

  const period = String(rawValue).trim();
  
  // Format: YYYY-MM
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  
  // Format: MM/YYYY or M/YYYY
  const slashMatch = period.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    return `${slashMatch[2]}-${month}`;
  }
  
  // Format: DD/MM/YYYY - extract month and year
  const dateMatch = period.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dateMatch) {
    let yr = parseInt(dateMatch[3], 10);
    if (yr < 100) yr = yr < 50 ? 2000 + yr : 1900 + yr;
    const month = dateMatch[2].padStart(2, '0');
    return `${yr}-${month}`;
  }
  
  // Normalize: remove accents, lowercase, split into parts
  const normalized = period.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').trim();
  const parts = normalized.split(/\s+/);
  
  // Look for month name in parts
  let foundMonth: string | null = null;
  let foundYear: number | null = null;
  
  for (const part of parts) {
    // Check if it's a month name
    if (monthMap[part]) {
      foundMonth = monthMap[part];
    }
    // Check if it's a year (4 digits or 2 digits)
    const numPart = parseInt(part, 10);
    if (part.length === 4 && numPart >= 2000 && numPart <= 2100) {
      foundYear = numPart;
    } else if (part.length === 2 && !isNaN(numPart)) {
      foundYear = numPart < 50 ? 2000 + numPart : 1900 + numPart;
    }
  }
  
  // If we found a month
  if (foundMonth) {
    // Use found year, or fallback to year parameter, or current year
    const yr = foundYear || year || new Date().getFullYear();
    return `${yr}-${foundMonth}`;
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
  
  // Clean and trim the date string
  const cleaned = String(rawDate).trim();
  if (!cleaned) return null;
  
  // Try to parse DD/MM/YYYY or DD/M/YYYY or D/M/YYYY formats
  const parts = cleaned.split(/[/\-\.]/);
  if (parts.length !== 3) return null;
  
  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);
  
  // Handle 2-digit years
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }
  
  // Validate ranges
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  
  // Format as YYYY-MM-DD with zero padding
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

async function performSync(userId: string, force: boolean = false): Promise<{ success: boolean; rowsProcessed: number }> {
  // Acquire lock to prevent simultaneous syncs
  if (!acquireSyncLock()) {
    return { success: true, rowsProcessed: 0 };
  }
  
  try {
    // Load organization_id for org-based RLS policies
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const organizationId = (profileData as any)?.organization_id as string | undefined;
    if (!organizationId) {
      throw new Error('No se pudo determinar la organización del usuario para sincronizar.');
    }

    const response = await fetch(CSV_URL);
    if (!response.ok) {
      releaseSyncLock();
      throw new Error(`Error fetching sheet: ${response.statusText}`);
    }

    const csvText = await response.text();
    
    // Check if content has changed using hash
    const currentHash = simpleHash(csvText);
    const lastHash = localStorage.getItem(LAST_HASH_KEY);
    
    if (!force && lastHash === currentHash) {
      console.log('Google Sheet content unchanged, skipping sync.');
      releaseSyncLock();
      return { success: true, rowsProcessed: 0 };
    }
    
    // IMPORTANT: Save hash IMMEDIATELY to prevent duplicate syncs
    localStorage.setItem(LAST_HASH_KEY, currentHash);
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    
    console.log(`Content changed (hash: ${currentHash}), proceeding with sync...`);
    
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
      litros: headers.findIndex(h => h.includes('litros') || h.includes('litro')),
    };
    
    console.log('CSV Headers:', headers);
    console.log('Column indices:', colIdx);

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

      // Detect formato SOLO desde la columna "Tipo" para respetar lo que indica el Excel
      // Ejemplos que se consideran bidón: "Bidón", "Bidon 20L", "Bidón 20 L", "Garrafón", etc.
      const normalizedTipo = String(tipo || '').toLowerCase();
      const isBidon =
        normalizedTipo.includes('bidón') ||
        normalizedTipo.includes('bidon') ||
        normalizedTipo.includes('20l') ||
        normalizedTipo.includes('20 l') ||
        normalizedTipo.includes('garraf');
      
      const formato = isBidon ? 'bidon_20l' : 'botella';
      
      // Log first few rows for debugging
      if (i < 3) {
        console.log(`Row ${i}: tipo="${tipo}", formato=${formato}, mes="${mes}", fecha="${fecha}"`);
      }

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
      // Datos compartidos: dejamos que la tabla sea un espejo EXACTO del Google Sheet.
      // Borramos todos los registros actuales y luego insertamos solo lo que viene del sheet.
      
      // Step 1: Get all existing record IDs
      const { data: existingRecords } = await supabase
        .from('human_water_consumption')
        .select('id');
      
      // Step 2: Delete all existing records by ID
      if (existingRecords && existingRecords.length > 0) {
        const idsToDelete = existingRecords.map(r => r.id);
        console.log(`Deleting ${idsToDelete.length} existing records...`);
        
        // Delete in batches of 100 to avoid query limits
        for (let i = 0; i < idsToDelete.length; i += 100) {
          const batch = idsToDelete.slice(i, i + 100);
          const { error: deleteError } = await supabase
            .from('human_water_consumption')
            .delete()
            .in('id', batch);
          
          if (deleteError) {
            console.error('Delete error:', deleteError);
            throw deleteError;
          }
        }
      }

      // Step 3: Insert fresh records from Google Sheet
      console.log(`Inserting ${records.length} new records...`);
      const { error: insertError } = await supabase
        .from('human_water_consumption')
        .insert(records);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      
      console.log('Sync complete. Records in DB should now match Google Sheet exactly.');
    }

    releaseSyncLock();
    return { success: true, rowsProcessed: records.length };
  } catch (error) {
    console.error('Auto-sync error:', error);
    releaseSyncLock();
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

    const result = await performSync(userId, force);

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

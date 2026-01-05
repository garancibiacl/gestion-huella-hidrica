import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { derivePeriodKeyFromDate, formatPeriodLabel } from '@/lib/petroleum/utils';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSulIUx_mfD52-RGGAaiurttquT3pw9vQhZrI-WcLHozUyeovvIzGam23LnygJ2Wg/pub?gid=827941193&single=true&output=csv';
const LAST_SYNC_KEY = 'last_petroleum_sync';
const LAST_HASH_KEY = 'last_petroleum_hash';
const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface PetroleumSyncResult {
  success: boolean;
  rowsProcessed: number;
  errors?: string[];
}

interface UsePetroleumSyncOptions {
  enabled?: boolean;
  onSyncStart?: () => void;
  onSyncComplete?: (success: boolean, rowsProcessed: number, errors?: string[]) => void;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

function normalizeHeader(value: string): string {
  return value
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
      if (currentRow.some((cell) => cell.length > 0)) {
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
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function parseChileanCurrency(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[$\s.]/g, '').replace(/,/g, '');
  const num = parseInt(cleaned, 10);
  return Number.isNaN(num) ? null : num;
}

function parseLiters(value: string | undefined): number | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.replace(/\./g, '').replace(/,/g, '.');
  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

function convertToISODate(value: string | undefined): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  const ddmmyyyy = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const yyyymmdd = str.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const asDate = new Date(str);
  if (!Number.isNaN(asDate.getTime())) {
    return asDate.toISOString().split('T')[0];
  }

  return null;
}

async function performPetroleumSync(userId: string, force: boolean = false): Promise<PetroleumSyncResult> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();

    const organizationId = profile?.organization_id as string | undefined;
    if (!organizationId) {
      return { success: false, rowsProcessed: 0, errors: ['No se pudo determinar la organización del usuario.'] };
    }

    const fetchUrl = force ? `${CSV_URL}&cacheBust=${Date.now()}` : CSV_URL;
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      return {
        success: false,
        rowsProcessed: 0,
        errors: [`Error al obtener la hoja de Petróleo: ${response.status} ${response.statusText}`],
      };
    }

    const csvText = await response.text();
    const currentHash = simpleHash(csvText);
    const lastHash = localStorage.getItem(LAST_HASH_KEY);

    if (!force && lastHash === currentHash) {
      console.log('Petroleum sheet unchanged, skipping sync.');
      return { success: true, rowsProcessed: 0 };
    }

    localStorage.setItem(LAST_HASH_KEY, currentHash);
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return { success: true, rowsProcessed: 0 };
    }

    const headers = rows[0].map((h) => normalizeHeader(h));
    const dataRows = rows.slice(1);

    const idx = {
      fechaEmision: headers.findIndex((h) => h.includes('fecha emision') || h === 'fecha'),
      fechaPago: headers.findIndex((h) => h.includes('fecha de pago') || h.includes('pago')),
      centroTrabajo: headers.findIndex((h) => h.includes('centro de trabajo') || h.includes('centro trabajo')),
      consumoFaena: headers.findIndex((h) => h.includes('consumo en faena minera')),
      razonSocial: headers.findIndex((h) => h.includes('razon social') || h.includes('razón social')),
      litros: headers.findIndex((h) => h === 'litros'),
      proveedor: headers.findIndex((h) => h.includes('proveedor')),
      costoTotal: headers.findIndex((h) => h.includes('costo total') || h === 'total'),
    };

    const records: any[] = [];

    dataRows.forEach((row, i) => {
      const get = (index: number) => (index >= 0 ? row[index] ?? '' : '');

      const fechaEmisionRaw = String(get(idx.fechaEmision));
      const fechaPagoRaw = String(get(idx.fechaPago));
      const centro = String(get(idx.centroTrabajo)).trim();
      const consumoFaena = String(get(idx.consumoFaena)).trim();
      const razon = String(get(idx.razonSocial)).trim();
      const litrosRaw = String(get(idx.litros));
      const proveedor = String(get(idx.proveedor)).trim();
      const costoRaw = String(get(idx.costoTotal));

      if (!centro && !litrosRaw) return;

      const dateEmission = convertToISODate(fechaEmisionRaw);
      const datePayment = convertToISODate(fechaPagoRaw);
      const periodKey =
        derivePeriodKeyFromDate(dateEmission) || derivePeriodKeyFromDate(datePayment) || '1970-01';
      const periodLabel = formatPeriodLabel(periodKey);

      const liters = parseLiters(litrosRaw) ?? 0;
      if (liters <= 0) return;

      const totalCost = parseChileanCurrency(costoRaw);

      records.push({
        user_id: userId,
        organization_id: organizationId,
        period: periodKey,
        period_label: periodLabel,
        date_emission: dateEmission,
        date_payment: datePayment,
        center: centro || null,
        company: razon || null,
        supplier: proveedor || null,
        liters,
        total_cost: totalCost,
        mining_use_raw: consumoFaena || null,
        is_mining_use: consumoFaena && consumoFaena.toUpperCase() !== 'N/A',
      });
    });

    if (records.length === 0) {
      return { success: true, rowsProcessed: 0 };
    }

    // Mirror sync: borrar registros previos de este usuario/org y reinsertar
    const { error: deleteError } = await supabase
      .from('petroleum_consumption')
      .delete()
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.error('Error deleting previous petroleum records', deleteError);
    }

    const { error: insertError } = await supabase.from('petroleum_consumption').insert(records);
    if (insertError) {
      console.error('Error inserting petroleum records', insertError);
      return { success: false, rowsProcessed: 0, errors: [insertError.message] };
    }

    return { success: true, rowsProcessed: records.length };
  } catch (error: any) {
    console.error('performPetroleumSync error', error);
    return { success: false, rowsProcessed: 0, errors: [error.message || 'Error desconocido al sincronizar petróleo.'] };
  }
}

export function usePetroleumSync(options: UsePetroleumSyncOptions = {}) {
  const { enabled = true, onSyncStart, onSyncComplete } = options;
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? Number(stored) : null;
  });
  const syncInProgressRef = useRef(false);

  const sync = useCallback(
    async (force: boolean = false) => {
      if (!user || syncInProgressRef.current) return;

      const now = Date.now();
      if (!force && lastSyncAt && now - lastSyncAt < MIN_SYNC_INTERVAL) {
        console.log('Petroleum sync throttled by MIN_SYNC_INTERVAL');
        return;
      }

      syncInProgressRef.current = true;
      setIsSyncing(true);
      onSyncStart?.();

      const result = await performPetroleumSync(user.id, force);

      if (result.success) {
        const ts = Date.now();
        setLastSyncAt(ts);
        localStorage.setItem(LAST_SYNC_KEY, ts.toString());
      }

      setIsSyncing(false);
      syncInProgressRef.current = false;
      onSyncComplete?.(result.success, result.rowsProcessed, result.errors);
    },
    [user, lastSyncAt, onSyncStart, onSyncComplete],
  );

  useEffect(() => {
    if (!enabled || !user) return;

    const stored = localStorage.getItem(LAST_SYNC_KEY);
    const last = stored ? Number(stored) : null;
    const now = Date.now();

    if (!last || now - last > MIN_SYNC_INTERVAL) {
      sync(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.id]);

  return {
    sync,
    isSyncing,
    lastSyncAt,
  };
}

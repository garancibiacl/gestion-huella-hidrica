import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { parsePamSheet, importPamWeek } from '../services/pamImporter';

// URL pública del Google Sheet PLS (formato CSV)
// Debe coincidir con el Sheet que se abre desde la pantalla de Planificación semanal PLS.
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSm6kI2pKhHhLX5kwP2AWWwbc1fYr9h96k9OqumbRqJtcxSKeW7VUbhtDmXQuyksQ/pub?output=csv";
const LAST_SYNC_KEY = "last_pls_sync";
const LAST_HASH_KEY = "last_pls_hash";
const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface PamSyncResult {
  success: boolean;
  tasksCreated: number;
  errors: string[];
  importedWeekYear?: number;
  importedWeekNumber?: number;
}

interface UsePamSyncOptions {
  enabled?: boolean;
  onSyncStart?: () => void;
  onSyncComplete?: (
    success: boolean,
    tasksCreated: number,
    errors: string[],
    importedWeek?: { weekYear: number; weekNumber: number }
  ) => void;
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

async function performPamSync(
  userId: string,
  organizationId: string,
  options?: { force?: boolean; weekYear?: number; weekNumber?: number }
): Promise<PamSyncResult> {
  const force = options?.force ?? false;
  const targetWeekYear = options?.weekYear;
  const targetWeekNumber = options?.weekNumber;

  try {
    console.log("Starting PLS sync...", {
      userId,
      organizationId,
      force,
      targetWeekYear,
      targetWeekNumber,
    });

    const response = await fetch(CSV_URL);
    if (!response.ok) {
      return {
        success: false,
        tasksCreated: 0,
        errors: [`Error fetching Google Sheet: ${response.statusText}`],
      };
    }

    const csvText = await response.text();
    const currentHash = simpleHash(csvText);
    const lastHash = localStorage.getItem(LAST_HASH_KEY);

    if (!force && lastHash === currentHash) {
      console.log("PLS sheet content unchanged, skipping sync.");
      return { success: true, tasksCreated: 0, errors: [] };
    }

    localStorage.setItem(LAST_HASH_KEY, currentHash);
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

    // Parse CSV
    const { tasks: parsedTasks, errors: parseErrors } = parsePamSheet(csvText);

    if (parseErrors.length > 0) {
      console.warn("PLS parse errors:", parseErrors);
      return {
        success: false,
        tasksCreated: 0,
        errors: parseErrors,
      };
    }

    // Si la pantalla está en una semana específica, importamos SOLO esa semana.
    const tasks =
      targetWeekYear && targetWeekNumber
        ? parsedTasks.filter(
            (t) => t.weekYear === targetWeekYear && t.weekNumber === targetWeekNumber
          )
        : parsedTasks;

    const importedWeekYear = targetWeekYear ?? tasks[0]?.weekYear;
    const importedWeekNumber = targetWeekNumber ?? tasks[0]?.weekNumber;

    if (!tasks.length) {
      return {
        success: true,
        tasksCreated: 0,
        errors: [],
        importedWeekYear,
        importedWeekNumber,
      };
    }

    const result = await importPamWeek({
      organizationId,
      uploadedByUserId: userId,
      tasks,
      sourceFilename: "Google Sheets (auto-sync)",
    });

    console.log("PLS sync complete:", result);

    return {
      success: result.success,
      tasksCreated: result.tasksCreated,
      errors: result.errors,
      importedWeekYear,
      importedWeekNumber,
    };
  } catch (error) {
    console.error("PLS sync error:", error);
    return {
      success: false,
      tasksCreated: 0,
      errors: [error instanceof Error ? error.message : "Error desconocido al sincronizar"],
    };
  }
}

export function usePamSync(options: UsePamSyncOptions = {}) {
  const { enabled = true, onSyncStart, onSyncComplete } = options;
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const syncInProgress = useRef(false);
  const hasInitialSynced = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const shouldSync = useCallback(() => {
    if (!enabled || !user?.id || !organizationId) return false;
    const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);
    if (!lastSyncStr) return true;
    const lastSync = parseInt(lastSyncStr, 10);
    return Date.now() - lastSync >= MIN_SYNC_INTERVAL;
  }, [enabled, user?.id, organizationId]);

  const syncPam = useCallback(
    async (params?: { force?: boolean; weekYear?: number; weekNumber?: number } | boolean) => {
      // backward compatible: syncPam(true)
      const normalized =
        typeof params === "boolean" ? { force: params } : { force: false, ...(params || {}) };

      if (!user?.id || !organizationId || syncInProgress.current) return;

      if (!normalized.force && !shouldSync()) {
        console.log("PLS sync skipped (too soon)");
        return;
      }

      syncInProgress.current = true;
      setIsSyncing(true);
      onSyncStart?.();

      const result = await performPamSync(user.id, organizationId, normalized);

      syncInProgress.current = false;
      setIsSyncing(false);
      setLastSyncAt(Date.now());
      onSyncComplete?.(
        result.success,
        result.tasksCreated,
        result.errors,
        result.importedWeekYear && result.importedWeekNumber
          ? { weekYear: result.importedWeekYear, weekNumber: result.importedWeekNumber }
          : undefined
      );

      return result;
    },
    [user?.id, organizationId, shouldSync, onSyncStart, onSyncComplete]
  );

  // Auto-sync on mount (always sync on first load)
  useEffect(() => {
    if (enabled && user?.id && organizationId && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      syncPam({ force: true });
    }
  }, [enabled, user?.id, organizationId, syncPam]);

  // Auto-sync when window regains focus
  useEffect(() => {
    if (!enabled || !user?.id || !organizationId) return;

    const handleFocus = () => {
      syncPam();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [enabled, user?.id, organizationId, syncPam]);

  return { syncPam, isSyncing, lastSyncAt };
}

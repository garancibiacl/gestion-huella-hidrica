import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const LAST_SYNC_KEY = 'last_electric_sync';
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

async function performElectricSync(): Promise<ElectricSyncResult> {
  try {
    // supabase.functions.invoke automatically includes the user's JWT
    const { data, error } = await supabase.functions.invoke('sync-electric-meters');

    if (error) {
      console.error('Error calling sync-electric-meters:', error);
      return { success: false, rowsInserted: 0, errors: [error.message] };
    }

    console.log('sync-electric-meters response:', data);

    // Save sync timestamp on success
    if (data?.success) {
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    }

    return {
      success: data?.success ?? false,
      rowsInserted: data?.rows_inserted ?? 0,
      errors: data?.errors ?? [],
    };
  } catch (err: any) {
    console.error('Error syncing electric meters:', err);
    return { success: false, rowsInserted: 0, errors: [err.message] };
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

    const result = await performElectricSync();

    syncInProgress.current = false;
    setIsSyncing(false);
    
    if (result.success) {
      setLastSyncAt(Date.now());
    }

    onSyncComplete?.(result.success, result.rowsInserted, result.errors);

    return result;
  }, [user?.id, shouldSync, onSyncStart, onSyncComplete]);

  // Auto-sync on mount if enabled
  useEffect(() => {
    if (enabled && user?.id && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      syncElectric(true);
    }
  }, [enabled, user?.id, syncElectric]);

  return { syncElectric, isSyncing, lastSyncAt };
}

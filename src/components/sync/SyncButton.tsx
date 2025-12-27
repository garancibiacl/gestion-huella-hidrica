import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useAutoSync } from '@/hooks/useAutoSync';

interface SyncButtonProps {
  onSyncComplete?: () => void;
}

interface SyncRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  rows_inserted: number;
  rows_updated: number;
  errors: string[];
}

export function SyncButton({ onSyncComplete }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncRun | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Use the auto-sync hook for manual sync
  const { sync } = useAutoSync({
    enabled: false, // Don't auto-sync in this component
    userId: user?.id,
    onSyncStart: () => setSyncing(true),
    onSyncComplete: (success, rowsProcessed) => {
      setSyncing(false);
      
      if (success) {
        toast({
          title: 'Sincronización completada',
          description: `${rowsProcessed} registros procesados`,
        });
        
        fetchLastSync();
        
        if (onSyncComplete) {
          onSyncComplete();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al sincronizar',
          description: 'No se pudo completar la sincronización',
        });
      }
    },
  });

  useEffect(() => {
    if (user) {
      checkAdminRole();
      fetchLastSync();
    }
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    // Allow both admin and prevencionista to sync (data is shared)
    const role = data?.role;
    setIsAdmin(role === 'admin' || role === 'prevencionista');
  };

  const fetchLastSync = async () => {
    if (!user) return;

    try {
      const lastSyncTimestamp = localStorage.getItem('last_google_sheets_sync');
      if (lastSyncTimestamp) {
        setLastSync({
          id: 'local',
          started_at: new Date(parseInt(lastSyncTimestamp)).toISOString(),
          finished_at: new Date(parseInt(lastSyncTimestamp)).toISOString(),
          rows_inserted: 0,
          rows_updated: 0,
          errors: [],
        });
      }
    } catch (error) {
      console.error('Error fetching last sync:', error);
    }
  };

  const handleSync = async () => {
    // Force sync regardless of time interval
    await sync(true);
  };

  const formatLastSync = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-CL', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleSync}
        disabled={syncing}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
      </Button>

      <AnimatePresence mode="wait">
        {lastSync && !syncing && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            {lastSync.errors.length === 0 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-warning" />
            )}
            <Clock className="w-3.5 h-3.5" />
            <span>
              Última sync: {formatLastSync(lastSync.started_at)}
            </span>
            {lastSync.rows_inserted > 0 && (
              <span className="text-success">
                (+{lastSync.rows_inserted})
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

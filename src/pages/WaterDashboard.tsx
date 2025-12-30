import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gauge, Users, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import MeterConsumption from '@/components/dashboard/MeterConsumption';
import HumanWaterConsumption from '@/components/dashboard/HumanWaterConsumption';
import { useWaterSync } from '@/hooks/useWaterSync';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';

export default function WaterDashboard() {
  const [activeTab, setActiveTab] = useState('medidor');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dataReady, setDataReady] = useState(false);
  const { user } = useAuth();
  const { isAdmin, isPrevencionista } = useRole();
  const { toast } = useToast();

  const { sync, isSyncing, lastSyncAt } = useWaterSync({
    enabled: true,
    onSyncComplete: (success, rowsProcessed) => {
      setDataReady(true);
      if (success && rowsProcessed > 0) {
        setRefreshKey(prev => prev + 1);
        toast({
          title: 'Sincronización de agua completada',
          description: `${rowsProcessed} registros procesados`,
        });
      }
    },
  });

  const handleSync = async () => {
    await sync(true);
  };

  const formatLastSync = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canSync = isAdmin || isPrevencionista;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <PageHeader
          title="Dashboard Agua"
          description="Monitoreo de consumo hídrico por medidor y consumo humano"
        />

        {canSync && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Agua'}
            </Button>

            <AnimatePresence mode="wait">
              {lastSyncAt && !isSyncing && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatLastSync(lastSyncAt)}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/60 rounded-xl p-1">
            <TabsTrigger
              value="medidor"
              className="gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Gauge className="w-4 h-4" />
              <span className="hidden sm:inline">Consumo por Medidor</span>
              <span className="sm:hidden">Medidor</span>
            </TabsTrigger>
            <TabsTrigger
              value="humano"
              className="gap-2 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Consumo Humano</span>
              <span className="sm:hidden">Humano</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medidor" className="mt-6">
            <MeterConsumption key={`meter-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="humano" className="mt-6">
            {dataReady ? (
              <HumanWaterConsumption key={`human-${refreshKey}`} />
            ) : (
              <div className="stat-card flex items-center justify-center py-12">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Sincronizando datos de consumo humano...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

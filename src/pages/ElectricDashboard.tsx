import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, RefreshCw, CheckCircle2, Clock, LineChart } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ElectricMeterConsumption from '@/components/dashboard/ElectricMeterConsumption';
import ElectricConsumptionHistory from '@/components/dashboard/ElectricConsumptionHistory';
import { useElectricSync } from '@/hooks/useElectricSync';
import { useElectricMeters } from '@/hooks/useElectricMeters';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';

export default function ElectricDashboard() {
  const [activeTab, setActiveTab] = useState('medidor');
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const { isAdmin, isPrevencionista } = useRole();
  const { toast } = useToast();
  const { refetch } = useElectricMeters();

  const { syncElectric, isSyncing, lastSyncAt } = useElectricSync({
    enabled: true,
    onSyncComplete: (success, rowsInserted, errors) => {
      if (success) {
        if (rowsInserted > 0) {
          toast({
            title: 'Sincronización eléctrica completada',
            description: `${rowsInserted} registros insertados`,
          });
        } else {
          toast({
            title: 'Sincronización completada',
            description: 'No hubo cambios en los datos',
          });
        }
        setRefreshKey(prev => prev + 1);
        refetch();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al sincronizar',
          description: errors.length > 0 ? errors[0] : 'Error desconocido',
        });
      }
    },
  });

  const handleSync = async () => {
    await syncElectric(true);
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
          title="Dashboard Energía Eléctrica"
          description="Monitoreo de consumo eléctrico por medidor"
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
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Energía'}
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
          <TabsList className="grid w-full max-w-xl grid-cols-3 bg-muted/60 rounded-xl p-1">
            <TabsTrigger
              value="medidor"
              className="gap-2 rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Luz por Medidor</span>
              <span className="sm:hidden">Medidor</span>
            </TabsTrigger>
            <TabsTrigger
              value="eficiencia"
              className="gap-2 rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm"
              disabled
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Eficiencia</span>
              <span className="sm:hidden">Eficiencia</span>
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="gap-2 rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm"
            >
              <LineChart className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medidor" className="mt-6">
            <ElectricMeterConsumption key={`electric-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="eficiencia" className="mt-6">
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <Activity className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Próximamente</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Panel de eficiencia energética y alertas de consumo anómalo.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <ElectricConsumptionHistory key={`history-${refreshKey}`} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Activity, RefreshCw, CheckCircle2, Clock, LineChart } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import WaterMeterConsumption from '@/components/dashboard/WaterMeterConsumption';
import { useWaterMeterSync } from '@/hooks/useWaterMeterSync';
import { useWaterMeters } from '@/hooks/useWaterMeters';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useToast } from '@/hooks/use-toast';

export default function WaterMeterDashboard() {
  const [activeTab, setActiveTab] = useState('medidor');
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const { isAdmin, isPrevencionista } = useRole();
  const { toast } = useToast();
  const { refetch } = useWaterMeters();

  const { syncWaterMeter, isSyncing, lastSyncAt } = useWaterMeterSync({
    enabled: true,
    onSyncComplete: async (success, rowsInserted, errors) => {
      if (success) {
        if (rowsInserted > 0) {
          toast({
            title: 'Sincronización de agua completada',
            description: `${rowsInserted} registros insertados`,
          });
        } else {
          toast({
            title: 'Sincronización completada',
            description: 'No hubo cambios en los datos',
          });
        }
        await refetch();
        setRefreshKey(prev => prev + 1);
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
    await syncWaterMeter(true);
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
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <PageHeader
            title="Dashboard Agua Medidor"
            description="Monitoreo de consumo de agua por medidor (m³)"
          />

          {(isAdmin || isPrevencionista) && (
            <div className="flex items-center gap-3">
              {lastSyncAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatLastSync(lastSyncAt)}</span>
                </div>
              )}
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sincronizar Agua
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="medidor" className="gap-2">
              <Droplets className="w-4 h-4" />
              Agua por Medidor
            </TabsTrigger>
            <TabsTrigger value="historico" className="gap-2">
              <LineChart className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medidor" className="mt-6">
            <WaterMeterConsumption key={`water-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <div className="stat-card flex flex-col items-center justify-center py-12">
              <Activity className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Próximamente</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Panel histórico de consumo de agua por medidor.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

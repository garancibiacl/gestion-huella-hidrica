import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, RefreshCw, LineChart, Leaf } from 'lucide-react';
import { DashboardHeader } from '@/components/ui/dashboard-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import ElectricMeterConsumption from '@/components/dashboard/ElectricMeterConsumption';
import ElectricConsumptionHistory from '@/components/dashboard/ElectricConsumptionHistory';
import ElectricEmissions from '@/components/dashboard/ElectricEmissions';
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
    onSyncComplete: async (success, rowsInserted, errors) => {
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
        // Forzar refetch y luego incrementar key para remontar componentes
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
    <div className="bg-[#F4F5F7]">
      <div className="page-container space-y-6">
        <DashboardHeader
        title="Dashboard Energía Eléctrica"
        description="Monitoreo de consumo eléctrico por medidor"
        narrative="Este mes puedes revisar consumo, costos y emisiones para priorizar acciones de eficiencia."
        className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:flex-row sm:items-center"
        action={
          canSync ? (
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="sm"
              className="gap-2 bg-[#C3161D] text-white hover:bg-[#A31217]"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Energía'}
            </Button>
          ) : null
        }
        statusLabel={isSyncing ? 'Sincronizando' : lastSyncAt ? 'Actualizado' : 'Pendiente'}
        statusTone={isSyncing ? 'warning' : lastSyncAt ? 'success' : 'muted'}
        statusDetail={
          lastSyncAt && !isSyncing
            ? `Última actualización: ${formatLastSync(lastSyncAt)}`
            : !lastSyncAt && !isSyncing
            ? 'Sin sincronizaciones recientes'
            : undefined
        }
      />

        <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full max-w-full gap-2 overflow-x-auto rounded-xl bg-muted/60 p-1">
            <TabsTrigger
              value="medidor"
              className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Luz por Medidor</span>
              <span className="sm:hidden">Medidor</span>
            </TabsTrigger>
            <TabsTrigger
              value="emisiones"
              className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm"
            >
              <Leaf className="w-4 h-4" />
              <span className="hidden sm:inline">Emisiones Totales (kgCO₂e/kWh)</span>
              <span className="sm:hidden">Emisiones</span>
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-600 data-[state=active]:shadow-sm"
            >
              <LineChart className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medidor" className="mt-6">
            <ElectricMeterConsumption key={`electric-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="emisiones" className="mt-6">
            <ElectricEmissions />
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <ElectricConsumptionHistory key={`history-${refreshKey}`} />
          </TabsContent>
        </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

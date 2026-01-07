import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge,
  Users,
  RefreshCw,
  CheckCircle2,
  Clock,
  LineChart,
} from "lucide-react";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import WaterMeterConsumption from "@/components/dashboard/WaterMeterConsumption";
import WaterMeterRisks from "@/components/dashboard/WaterMeterRisks";
import HumanWaterConsumption from "@/components/dashboard/HumanWaterConsumption";
import WaterConsumptionHistory from "@/components/dashboard/WaterConsumptionHistory";
import { useWaterSync } from "@/hooks/useWaterSync";
import { useWaterMeterSync } from "@/hooks/useWaterMeterSync";
import { useWaterMeters } from "@/hooks/useWaterMeters";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useToast } from "@/hooks/use-toast";

export default function WaterDashboard() {
  const [activeTab, setActiveTab] = useState("medidor");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dataReady, setDataReady] = useState(false);
  const { user } = useAuth();
  const { isAdmin, isPrevencionista } = useRole();
  const { toast } = useToast();

  const { refetch: refetchWaterMeter } = useWaterMeters();

  // Sync para consumo humano (botellas/bidones)
  const {
    sync: syncHuman,
    isSyncing: isSyncingHuman,
    lastSyncAt: lastSyncHuman,
  } = useWaterSync({
    enabled: true,
    onSyncComplete: (success, rowsProcessed) => {
      setDataReady(true);
      if (success && rowsProcessed > 0) {
        setRefreshKey((prev) => prev + 1);
      }
    },
  });

  // Sync para consumo por medidor (m³)
  const {
    syncWaterMeter,
    isSyncing: isSyncingMeter,
    lastSyncAt: lastSyncMeter,
  } = useWaterMeterSync({
    enabled: true,
    onSyncComplete: async (success, rowsInserted) => {
      if (success) {
        await refetchWaterMeter();
        setRefreshKey((prev) => prev + 1);
      }
    },
  });

  const isSyncing = isSyncingHuman || isSyncingMeter;
  const lastSyncAt = Math.max(lastSyncHuman || 0, lastSyncMeter || 0) || null;

  const handleSync = async () => {
    // Sincronizar ambos en paralelo
    await Promise.all([syncHuman(true), syncWaterMeter(true)]);
    toast({
      title: "Sincronización completada",
      description: "Datos de agua actualizados",
    });
  };

  const formatLastSync = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Hace un momento";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canSync = isAdmin || isPrevencionista;

  return (
    <div className="page-container space-y-6">
      <DashboardHeader
        title="Dashboard Agua"
        description="Monitoreo de consumo hídrico por medidor y consumo humano"
        narrative="Este mes estás consolidando consumo, costos y señales de riesgo para tomar decisiones con mayor seguridad."
        action={
          canSync ? (
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="sm"
              className="gap-2 bg-[#C3161D] text-white hover:bg-[#A31217]"
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Sincronizando..." : "Sincronizar Agua"}
            </Button>
          ) : null
        }
        statusLabel={
          isSyncing ? "Sincronizando" : lastSyncAt ? "Actualizado" : "Pendiente"
        }
        statusTone={isSyncing ? "warning" : lastSyncAt ? "success" : "muted"}
        statusDetail={
          lastSyncAt && !isSyncing
            ? `Última actualización: ${formatLastSync(lastSyncAt)}`
            : !lastSyncAt && !isSyncing
            ? "Sin sincronizaciones recientes"
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
              className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Gauge className="w-4 h-4" />
              <span className="hidden sm:inline">Consumo por Medidor</span>
              <span className="sm:hidden">Medidor</span>
            </TabsTrigger>
            <TabsTrigger
              value="humano"
              className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Consumo Humano</span>
              <span className="sm:hidden">Humano</span>
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="gap-2 whitespace-nowrap rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              <LineChart className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
              <span className="sm:hidden">Histórico</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="medidor" className="mt-6">
            <div className="space-y-6">
              <WaterMeterRisks />
              <WaterMeterConsumption key={`meter-${refreshKey}`} />
            </div>
          </TabsContent>

          <TabsContent value="humano" className="mt-6">
            {dataReady ? (
              <HumanWaterConsumption key={`human-${refreshKey}`} />
            ) : (
              <EmptyState
                title="Preparando datos"
                description="Sincronizando consumo humano para mostrar el tablero."
                icon={
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                }
              />
            )}
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <WaterConsumptionHistory />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

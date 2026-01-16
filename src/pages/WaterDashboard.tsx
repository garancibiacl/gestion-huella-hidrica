import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge,
  Users,
  RefreshCw,
  CheckCircle2,
  Clock,
  LineChart,
  Trash2,
  ChevronDown,
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
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Swal from "sweetalert2";

export default function WaterDashboard() {
  const [activeTab, setActiveTab] = useState("medidor");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dataReady, setDataReady] = useState(false);
  const { user } = useAuth();
  const { isAdmin, isPrevencionista } = useRole();
  const { toast } = useToast();
  const { organizationId } = useOrganization();

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

  const handleCleanAndSync = async () => {
    if (!organizationId) {
      toast({
        title: "Error",
        description: "No se pudo determinar la organización actual",
        variant: "destructive",
      });
      return;
    }

    // Confirmar con el usuario
    const result = await Swal.fire({
      title: "¿Limpiar datos de medidor?",
      html: `
        <p>Esto <strong>eliminará todos</strong> los registros de consumo por medidor de tu organización.</p>
        <p class="text-sm text-gray-600 mt-2">Los datos se volverán a sincronizar desde Google Sheets.</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, limpiar y sincronizar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      reverseButtons: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      // Paso 1: Limpiar datos existentes
      toast({
        title: "Limpiando datos...",
        description: "Eliminando registros antiguos",
      });

      // Use type assertion since the function was just created and types haven't regenerated yet
      const { data: cleanResult, error: cleanError } = await (supabase.rpc as any)(
        "clean_water_meter_readings_for_org",
        { p_organization_id: organizationId }
      );

      if (cleanError) {
        throw new Error(`Error al limpiar datos: ${cleanError.message}`);
      }

      const deletedCount = Array.isArray(cleanResult) 
        ? (cleanResult[0]?.deleted_count || 0) 
        : 0;

      toast({
        title: "Datos limpiados",
        description: `Se eliminaron ${deletedCount} registros`,
      });

      // Paso 2: Sincronizar desde Google Sheets
      toast({
        title: "Sincronizando desde Google Sheets...",
        description: "Descargando datos actualizados",
      });

      await syncWaterMeter(true);
      await refetchWaterMeter();
      setRefreshKey((prev) => prev + 1);

      // Confirmación final
      await Swal.fire({
        title: "¡Sincronización completa!",
        text: `Se eliminaron ${deletedCount} registros antiguos y se sincronizaron los datos actuales desde Google Sheets.`,
        icon: "success",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#10b981",
      });
    } catch (error: any) {
      console.error("Error al limpiar y sincronizar:", error);
      toast({
        title: "Error en la sincronización",
        description: error.message || "No se pudo completar la operación",
        variant: "destructive",
      });
    }
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
    <div className="bg-[#F4F5F7]">
      <div className="page-container space-y-6">
      <DashboardHeader
        title="Dashboard Agua"
        description="Monitoreo de consumo hídrico por medidor y consumo humano"
        narrative="Este mes estás consolidando consumo, costos y señales de riesgo para tomar decisiones con mayor seguridad."
        className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-6 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:flex-row sm:items-center"
        action={
          canSync ? (
            <div className="flex gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                size="sm"
                className="gap-2 bg-[#C3161D] text-white hover:bg-[#A31217]"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                />
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSyncing}
                    className="gap-1 px-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Sincronizar</span>
                      <span className="text-xs text-muted-foreground">
                        Actualizar datos normalmente
                      </span>
                    </div>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem
                    onClick={handleCleanAndSync}
                    disabled={isSyncing || !organizationId}
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="font-medium">Limpiar y resincronizar</span>
                      <span className="text-xs text-muted-foreground">
                        Eliminar todo y recargar desde Sheet
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
              <WaterMeterConsumption key={`meter-${refreshKey}`} />
              <WaterMeterRisks />
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
    </div>
  );
}

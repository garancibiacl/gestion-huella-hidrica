import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MeterConsumption from '@/components/dashboard/MeterConsumption';
import HumanWaterConsumption from '@/components/dashboard/HumanWaterConsumption';
import { SyncButton } from '@/components/sync/SyncButton';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('medidor');
  const [refreshKey, setRefreshKey] = useState(0);
  const [humanReady, setHumanReady] = useState(false);
  const { user } = useAuth();

  const handleSyncComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Auto-sync on mount and when window regains focus
  useAutoSync({
    enabled: true,
    userId: user?.id,
    onSyncComplete: (success, rowsProcessed) => {
      // Marcamos que la primera sync (o intento) ya terminó
      setHumanReady(true);

      // Si hubo cambios reales en la hoja, forzamos recarga de data
      if (success && rowsProcessed > 0) {
        setRefreshKey(prev => prev + 1);
      }
    },
  });

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <PageHeader 
          title="Dashboard Ambiental" 
          description="Monitoreo de huella hídrica en tiempo real"
        />
        <SyncButton onSyncComplete={handleSyncComplete} />
      </div>

      {/* Tabs for consumption type */}
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
            {humanReady ? (
              <HumanWaterConsumption key={`human-${refreshKey}`} />
            ) : (
              <div className="stat-card">
                <p className="text-sm text-muted-foreground">Sincronizando datos de consumo humano...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MeterConsumption from '@/components/dashboard/MeterConsumption';
import HumanWaterConsumption from '@/components/dashboard/HumanWaterConsumption';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('medidor');

  return (
    <div className="page-container">
      <PageHeader 
        title="Dashboard Ambiental" 
        description="Monitoreo de huella hídrica en tiempo real"
      />

      {/* Tabs for consumption type */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="medidor" className="gap-2">
              <Gauge className="w-4 h-4" />
              <span className="hidden sm:inline">Consumo por Medidor</span>
              <span className="sm:hidden">Medidor</span>
            </TabsTrigger>
            <TabsTrigger value="humano" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Consumo Humano</span>
              <span className="sm:hidden">Humano</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="medidor" className="mt-6">
            <MeterConsumption />
          </TabsContent>
          
          <TabsContent value="humano" className="mt-6">
            <HumanWaterConsumption />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

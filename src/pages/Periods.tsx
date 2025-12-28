import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, Eye, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonTable } from '@/components/ui/skeleton-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface WaterReading {
  id: string;
  period: string;
  consumo_m3: number;
  costo?: number;
  observaciones?: string;
}

export default function Periods() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<WaterReading[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) fetchReadings();
  }, [user]);

  const fetchReadings = async () => {
    const { data } = await supabase
      .from('water_readings')
      .select('*')
      .order('period', { ascending: false });
    
    if (data) setReadings(data.map(r => ({ ...r, consumo_m3: Number(r.consumo_m3), costo: r.costo ? Number(r.costo) : undefined })));
    setLoading(false);
  };

  const formatPeriod = (p: string) => {
    const [y, m] = p.split('-');
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${months[parseInt(m)-1]} ${y}`;
  };

  const getVariation = (idx: number) => {
    if (idx >= readings.length - 1) return null;
    const curr = readings[idx].consumo_m3;
    const prev = readings[idx + 1].consumo_m3;
    return ((curr - prev) / prev) * 100;
  };

  const average = readings.length > 0 ? readings.reduce((s, r) => s + r.consumo_m3, 0) / readings.length : 0;
  const filtered = readings.filter(r => formatPeriod(r.period).toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="page-container"><PageHeader title="Períodos de Consumo" /><SkeletonTable rows={6} /></div>;

  return (
    <div className="page-container">
      <PageHeader title="Períodos de Consumo" description="Histórico completo de consumo hídrico por período" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card mb-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por período..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Consumo (m³)</TableHead>
                <TableHead>Variación</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, idx) => {
                const variation = getVariation(idx);
                const isAlert = variation !== null && variation > 15;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{formatPeriod(r.period)}</TableCell>
                    <TableCell>{r.consumo_m3.toLocaleString()} m³</TableCell>
                    <TableCell>
                      {variation !== null && (
                        <span className={cn("flex items-center gap-1 text-sm", variation < 0 ? "text-success" : "text-destructive")}>
                          {variation < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                          {Math.abs(variation).toFixed(1)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", isAlert ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                        {isAlert ? 'Alerta' : 'Normal'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-sm text-muted-foreground">Promedio Mensual</p><p className="text-xl font-semibold">{Math.round(average).toLocaleString()} m³</p></div>
        <div className="stat-card"><p className="text-sm text-muted-foreground">Mejor Mes</p><p className="text-xl font-semibold">{readings.length > 0 ? formatPeriod(readings.reduce((min, r) => r.consumo_m3 < min.consumo_m3 ? r : min).period) : '-'}</p></div>
        <div className="stat-card"><p className="text-sm text-muted-foreground">Períodos con Alerta</p><p className="text-xl font-semibold">{readings.filter((_, i) => { const v = getVariation(i); return v !== null && v > 15; }).length} de {readings.length}</p></div>
      </div>
    </div>
  );
}

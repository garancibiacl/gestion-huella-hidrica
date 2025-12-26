import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  Target, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Upload,
  Leaf,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonCard, SkeletonChart } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WaterReading {
  period: string;
  consumo_m3: number;
}

interface Alert {
  id: string;
  message: string;
  period: string;
  type: 'warning' | 'error';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<WaterReading[]>([]);
  const [objective, setObjective] = useState(1000);
  const [threshold, setThreshold] = useState(15);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [period, setPeriod] = useState('6');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch water readings
      const { data: readingsData } = await supabase
        .from('water_readings')
        .select('period, consumo_m3')
        .eq('user_id', user?.id)
        .order('period', { ascending: true })
        .limit(parseInt(period));

      // Fetch criteria
      const { data: criteriaData } = await supabase
        .from('measurement_criteria')
        .select('objetivo_mensual, umbral_alerta_pct')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (readingsData) {
        setReadings(readingsData.map(r => ({
          period: r.period,
          consumo_m3: Number(r.consumo_m3)
        })));
      }

      if (criteriaData) {
        setObjective(Number(criteriaData.objetivo_mensual) || 1000);
        setThreshold(Number(criteriaData.umbral_alerta_pct) || 15);
      }

      // Generate alerts
      if (readingsData && readingsData.length > 0 && criteriaData) {
        const avg = readingsData.reduce((sum, r) => sum + Number(r.consumo_m3), 0) / readingsData.length;
        const newAlerts: Alert[] = [];
        
        readingsData.forEach((r) => {
          const variation = ((Number(r.consumo_m3) - avg) / avg) * 100;
          if (variation > (criteriaData.umbral_alerta_pct || 15)) {
            newAlerts.push({
              id: r.period,
              message: `Consumo superó el umbral del ${Math.round(variation)}%`,
              period: formatPeriod(r.period),
              type: 'warning'
            });
          }
        });
        
        setAlerts(newAlerts.slice(-3));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const currentConsumption = readings.length > 0 ? readings[readings.length - 1]?.consumo_m3 : 0;
  const previousConsumption = readings.length > 1 ? readings[readings.length - 2]?.consumo_m3 : currentConsumption;
  const variation = previousConsumption ? ((currentConsumption - previousConsumption) / previousConsumption) * 100 : 0;
  const average = readings.length > 0 
    ? readings.reduce((sum, r) => sum + r.consumo_m3, 0) / readings.length 
    : 0;

  const chartData = readings.map(r => ({
    name: formatPeriod(r.period),
    consumo: r.consumo_m3,
    objetivo: objective,
    promedio: Math.round(average)
  }));

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader 
          title="Dashboard Ambiental" 
          description="Monitoreo de huella hídrica en tiempo real" 
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader 
        title="Dashboard Ambiental" 
        description="Monitoreo de huella hídrica en tiempo real"
        action={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último año</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Consumo Actual"
          value={`${currentConsumption.toLocaleString()} m³`}
          icon={<Droplets className="w-5 h-5" />}
          trend={{
            value: `${Math.abs(variation).toFixed(1)}% ${variation < 0 ? 'menos' : 'más'}`,
            positive: variation < 0
          }}
          subtitle="vs. mes anterior"
          delay={0}
        />
        <StatCard
          title="Objetivo Mensual"
          value={`${objective.toLocaleString()} m³`}
          icon={<Target className="w-5 h-5" />}
          badge={{
            text: currentConsumption <= objective ? 'Cumplido' : 'Excedido',
            variant: currentConsumption <= objective ? 'success' : 'error'
          }}
          delay={0.1}
        />
        <StatCard
          title="Alertas Activas"
          value={`${alerts.length} alertas`}
          icon={<AlertTriangle className="w-5 h-5" />}
          badge={{
            text: alerts.length > 0 ? 'Requiere atención' : 'Sin alertas',
            variant: alerts.length > 0 ? 'warning' : 'success'
          }}
          delay={0.2}
        />
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="stat-card mb-6"
      >
        <h3 className="font-semibold mb-1">Tendencia de Consumo Hídrico</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Evolución mensual comparada con promedio y objetivo
        </p>
        
        {readings.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="consumoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.5}
                  vertical={false}
                />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
                    padding: '12px 16px',
                  }}
                  labelStyle={{
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  itemStyle={{
                    padding: '4px 0',
                  }}
                  cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Legend 
                  wrapperStyle={{
                    paddingTop: '20px'
                  }}
                  iconType="circle"
                  iconSize={8}
                />
                <ReferenceLine 
                  y={objective} 
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  label={{ 
                    value: `Objetivo: ${objective} m³`, 
                    fill: '#f59e0b',
                    fontSize: 11,
                    fontWeight: 500,
                    position: 'insideTopRight'
                  }}
                />
                <ReferenceLine 
                  y={Math.round(average)} 
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="consumo" 
                  name="Consumo Real"
                  stroke="url(#strokeGradient)"
                  strokeWidth={3}
                  fill="url(#consumoGradient)"
                  dot={{ 
                    fill: '#3b82f6', 
                    strokeWidth: 2,
                    stroke: '#fff',
                    r: 5,
                  }}
                  activeDot={{ 
                    r: 8, 
                    fill: '#8b5cf6',
                    stroke: '#fff',
                    strokeWidth: 3,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center bg-muted/30 rounded-lg">
            <div className="text-center">
              <Droplets className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No hay datos disponibles</p>
              <Link to="/importar">
                <Button variant="link" className="mt-2">
                  Importar datos
                </Button>
              </Link>
            </div>
          </div>
        )}
      </motion.div>

      {/* Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="stat-card"
        >
          <h3 className="font-semibold mb-1">Alertas Recientes</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Notificaciones que requieren tu atención
          </p>
          
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20"
                >
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.period}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Sin alertas activas</p>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="stat-card"
        >
          <h3 className="font-semibold mb-1">Acciones Rápidas</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Gestiona tus datos de forma eficiente
          </p>
          
          <div className="space-y-2">
            <Link to="/importar">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Importar nuevos datos
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/medidas">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Leaf className="w-4 h-4" />
                  Proponer medida sustentable
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/periodos">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Ver histórico completo
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

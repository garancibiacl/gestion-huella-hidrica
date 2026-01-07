import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  Target, 
  AlertTriangle, 
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
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/ui/chart-card';
import { SkeletonCard, SkeletonChart } from '@/components/ui/skeleton-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MOTION_EASE = [0.25, 0.46, 0.45, 0.94] as const;
const MOTION_MED = 0.5;

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

export default function MeterConsumption() {
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
      const { data: readingsData } = await supabase
        .from('water_readings')
        .select('period, consumo_m3')
        .order('period', { ascending: true })
        .limit(parseInt(period));

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
      <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </>
    );
  }

  return (
    <>
      {/* Period Filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex flex-col gap-1 sm:items-end">
          <label htmlFor="meter-period" className="text-xs font-medium text-muted-foreground">
            Período
          </label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger id="meter-period" className="w-full sm:w-56 [&>span]:line-clamp-2 [&>span]:leading-tight">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Selecciona un período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

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
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_MED, delay: 0.3, ease: MOTION_EASE }}
        className="mb-6 relative overflow-hidden"
      >
        {/* Animated accent line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: MOTION_MED, delay: 0.45, ease: MOTION_EASE }}
          className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/60 via-cyan-400/40 to-transparent origin-left"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        <ChartCard
          title="Tendencia de consumo hídrico"
          subtitle="Evolución mensual comparada con promedio y objetivo"
        >
          {readings.length > 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: MOTION_MED, delay: 0.4, ease: MOTION_EASE }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="consumoGradientMeter" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="strokeGradientMeter" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
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
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
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
                    stroke="url(#strokeGradientMeter)"
                    strokeWidth={3}
                    fill="url(#consumoGradientMeter)"
                    filter="url(#glow)"
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
                    isAnimationActive={true}
                    animationBegin={300}
                    animationDuration={1800}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="h-72 flex items-center justify-center bg-muted/30 rounded-lg"
            >
              <div className="text-center">
                <Droplets className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No hay datos disponibles</p>
                <Link to="/importar">
                  <Button variant="link" className="mt-2">
                    Importar datos
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </ChartCard>
      </motion.div>

      {/* Alerts and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, x: -30, rotateY: -5 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="stat-card relative overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-warning/60 via-amber-400/40 to-transparent origin-left"
          />
          <h3 className="font-semibold mb-1">Alertas Recientes</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Notificaciones que requieren tu atención
          </p>
          
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <motion.div 
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-warning/10 to-amber-500/5 border border-warning/20 cursor-default"
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                  >
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.period}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center h-32 bg-muted/30 rounded-lg"
            >
              <p className="text-muted-foreground">Sin alertas activas</p>
            </motion.div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 30, rotateY: 5 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="stat-card relative overflow-hidden"
        >
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/60 via-blue-400/40 to-transparent origin-left"
          />
          <h3 className="font-semibold mb-1">Acciones Rápidas</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Gestiona tus datos de forma eficiente
          </p>
          
          <div className="space-y-2">
            {[
              { to: '/importar', icon: Upload, label: 'Importar nuevos datos', delay: 0.7 },
              { to: '/medidas', icon: Leaf, label: 'Proponer medida sustentable', delay: 0.8 },
              { to: '/periodos', icon: Calendar, label: 'Ver histórico completo', delay: 0.9 },
            ].map((action, index) => (
              <motion.div
                key={action.to}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: action.delay }}
              >
                <Link to={action.to}>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between group/btn hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
                  >
                    <span className="flex items-center gap-2">
                      <action.icon className="w-4 h-4 group-hover/btn:text-primary transition-colors" />
                      {action.label}
                    </span>
                    <motion.span
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <ArrowRight className="w-4 h-4 group-hover/btn:text-primary transition-colors" />
                    </motion.span>
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}

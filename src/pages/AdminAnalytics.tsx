import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Eye, 
  Clock, 
  MousePointerClick,
  Globe,
  Monitor,
  Smartphone,
  FileText,
  ArrowUpRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  Percent,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { useRole } from '@/hooks/useRole';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Color corporativo
const PRIMARY_COLOR = '#b3382a';
const SUCCESS_COLOR = '#22c55e';

// Generar datos mock para el gráfico
const generateChartData = (days: number) => {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
      fullDate: date.toISOString().split('T')[0],
      visitas: Math.floor(Math.random() * 120) + 30,
      usuarios: Math.floor(Math.random() * 60) + 15,
    });
  }
  
  return data;
};

// Datos mock de páginas más visitadas
const mockPageViews = [
  { page: '/dashboard', name: 'Dashboard', views: 1245, percentage: 35 },
  { page: '/auth', name: 'Autenticación', views: 892, percentage: 25 },
  { page: '/importar', name: 'Importar Datos', views: 534, percentage: 15 },
  { page: '/periodos', name: 'Períodos', views: 356, percentage: 10 },
  { page: '/admin', name: 'Admin', views: 267, percentage: 8 },
  { page: '/medidas', name: 'Medidas', views: 178, percentage: 5 },
  { page: '/configuracion', name: 'Configuración', views: 71, percentage: 2 },
];

// Datos mock de fuentes de tráfico
const mockTrafficSources = [
  { source: 'Directo', visits: 2145, percentage: 65 },
  { source: 'Google', visits: 823, percentage: 25 },
  { source: 'Referido', visits: 329, percentage: 10 },
];

// Datos mock de dispositivos
const mockDevices = [
  { device: 'Escritorio', visits: 2156, percentage: 65, icon: Monitor },
  { device: 'Móvil', visits: 987, percentage: 30, icon: Smartphone },
  { device: 'Tablet', visits: 164, percentage: 5, icon: Monitor },
];

// Datos mock de países
const mockCountries = [
  { country: 'Chile', flag: '🇨🇱', visits: 2890, percentage: 87 },
  { country: 'Estados Unidos', flag: '🇺🇸', visits: 265, percentage: 8 },
  { country: 'Argentina', flag: '🇦🇷', visits: 99, percentage: 3 },
  { country: 'Perú', flag: '🇵🇪', visits: 66, percentage: 2 },
];

// KPIs mock
const mockKPIs = {
  uniqueVisitors: 1234,
  uniqueVisitorsChange: 12.5,
  pageViews: 4567,
  pageViewsChange: 8.3,
  viewsPerVisit: 3.7,
  viewsPerVisitChange: -2.1,
  avgDuration: '2m 45s',
  avgDurationChange: 5.2,
  bounceRate: 42.3,
  bounceRateChange: -3.8,
};

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  delay?: number;
}

function KPICard({ title, value, change, icon, delay = 0 }: KPICardProps) {
  const isPositive = change >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="stat-card"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <div className={cn(
            "flex items-center gap-1 mt-2 text-sm",
            isPositive ? "text-green-600" : "text-red-500"
          )}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{isPositive ? '+' : ''}{change}%</span>
            <span className="text-muted-foreground ml-1">vs período anterior</span>
          </div>
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="stat-card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-24 mb-2" />
          <div className="h-8 bg-muted rounded w-16 mb-2" />
          <div className="h-3 bg-muted rounded w-32" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-muted" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-6 bg-muted rounded w-48 mb-2" />
      <div className="h-4 bg-muted rounded w-64 mb-6" />
      <div className="h-72 bg-muted/50 rounded" />
    </div>
  );
}

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useRole();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    // Simular carga de datos
    setLoading(true);
    const timer = setTimeout(() => {
      setChartData(generateChartData(parseInt(period)));
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [period]);

  if (roleLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm text-primary">
            <span className="font-semibold">{payload[0].value}</span> visitas
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold">{payload[1]?.value || 0}</span> usuarios
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="Analytics" 
        description="Métricas de uso y rendimiento de la aplicación" 
      />

      {/* Period Selector */}
      <div className="flex justify-end mb-6">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KPICard
            title="Visitantes únicos"
            value={mockKPIs.uniqueVisitors.toLocaleString()}
            change={mockKPIs.uniqueVisitorsChange}
            icon={<Users className="w-6 h-6" />}
            delay={0}
          />
          <KPICard
            title="Páginas vistas"
            value={mockKPIs.pageViews.toLocaleString()}
            change={mockKPIs.pageViewsChange}
            icon={<Eye className="w-6 h-6" />}
            delay={0.1}
          />
          <KPICard
            title="Vistas por visita"
            value={mockKPIs.viewsPerVisit}
            change={mockKPIs.viewsPerVisitChange}
            icon={<MousePointerClick className="w-6 h-6" />}
            delay={0.2}
          />
          <KPICard
            title="Duración promedio"
            value={mockKPIs.avgDuration}
            change={mockKPIs.avgDurationChange}
            icon={<Clock className="w-6 h-6" />}
            delay={0.3}
          />
          <KPICard
            title="Tasa de rebote"
            value={`${mockKPIs.bounceRate}%`}
            change={mockKPIs.bounceRateChange}
            icon={<Percent className="w-6 h-6" />}
            delay={0.4}
          />
        </div>
      )}

      {/* Main Chart */}
      {loading ? (
        <SkeletonChart />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="stat-card mb-6"
        >
          <h3 className="font-semibold mb-1">Visitas por día</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Evolución del tráfico en los últimos {period} días
          </p>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUsuarios" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SUCCESS_COLOR} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={SUCCESS_COLOR} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="visitas"
                  stroke={PRIMARY_COLOR}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVisitas)"
                />
                <Area
                  type="monotone"
                  dataKey="usuarios"
                  stroke={SUCCESS_COLOR}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsuarios)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center gap-6 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PRIMARY_COLOR }} />
              <span className="text-sm text-muted-foreground">Visitas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SUCCESS_COLOR }} />
              <span className="text-sm text-muted-foreground">Usuarios únicos</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Páginas más visitadas</h3>
              <p className="text-sm text-muted-foreground">Top 7 páginas</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {mockPageViews.map((page, index) => (
              <div key={page.page} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{page.name}</span>
                    <span className="text-sm text-muted-foreground">{page.views.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${page.percentage}%`,
                        backgroundColor: PRIMARY_COLOR
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Traffic Sources */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Fuentes de tráfico</h3>
              <p className="text-sm text-muted-foreground">Origen de las visitas</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {mockTrafficSources.map((source) => (
              <div key={source.source} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{source.source}</span>
                    <span className="text-sm text-muted-foreground">{source.percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${source.percentage}%`,
                        backgroundColor: PRIMARY_COLOR
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-16 text-right">
                  {source.visits.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Devices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Dispositivos</h3>
              <p className="text-sm text-muted-foreground">Tipo de dispositivo usado</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {mockDevices.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.device} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{item.device}</span>
                      <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: item.device === 'Escritorio' ? PRIMARY_COLOR : SUCCESS_COLOR
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium w-16 text-right">
                    {item.visits.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Countries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="stat-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Países</h3>
              <p className="text-sm text-muted-foreground">Ubicación de los visitantes</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {mockCountries.map((item) => (
              <div key={item.country} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                  {item.flag}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{item.country}</span>
                    <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: PRIMARY_COLOR
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-16 text-right">
                  {item.visits.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

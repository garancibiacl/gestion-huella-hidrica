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
  Hourglass,
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
  ResponsiveContainer
} from 'recharts';
import { useRole } from '@/hooks/useRole';
import { PageHeader } from '@/components/ui/page-header';
import { LoaderHourglass } from '@/components/ui/loader-hourglass';
import RiskPanel from '@/components/admin/RiskPanel';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Color corporativo
const PRIMARY_COLOR = '#b3382a';
const SUCCESS_COLOR = '#22c55e';

interface AnalyticsOverview {
  unique_visitors: number;
  unique_visitors_prev: number;
  page_views: number;
  page_views_prev: number;
  views_per_visit: number;
  views_per_visit_prev: number;
  avg_duration_ms: number;
  avg_duration_ms_prev: number;
  bounce_rate: number;
  bounce_rate_prev: number;
  daily_stats: Array<{ date: string; visitas: number; usuarios: number }>;
}

interface TopPage {
  page_path: string;
  page_name: string;
  views: number;
  percentage: number;
}

interface DeviceStat {
  device_type: string;
  visits: number;
  percentage: number;
}

interface CountryStat {
  country: string;
  visits: number;
  percentage: number;
}

// Helper para calcular cambio porcentual
function calcChange(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 1000) / 10;
}

// Helper para formatear duración
function formatDuration(ms: number): string {
  if (ms === 0) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

// Mapeo de banderas por país
const countryFlags: Record<string, string> = {
  'Chile': '🇨🇱',
  'Estados Unidos': '🇺🇸',
  'Argentina': '🇦🇷',
  'Perú': '🇵🇪',
  'México': '🇲🇽',
  'Colombia': '🇨🇴',
  'España': '🇪🇸',
  'Brasil': '🇧🇷',
  'Desconocido': '🌐'
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
  
  // Data states
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceStat[]>([]);
  const [countryStats, setCountryStats] = useState<CountryStat[]>([]);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      const days = parseInt(period);
      
      try {
        // Fetch all data in parallel
        const [overviewRes, pagesRes, devicesRes, countriesRes] = await Promise.all([
          supabase.rpc('get_analytics_overview', { days }),
          supabase.rpc('get_top_pages', { days, limit_count: 7 }),
          supabase.rpc('get_device_stats', { days }),
          supabase.rpc('get_country_stats', { days })
        ]);

        if (overviewRes.data && overviewRes.data.length > 0) {
          const row = overviewRes.data[0];
          const dailyData = Array.isArray(row.daily_stats) ? row.daily_stats : [];
          setOverview({
            unique_visitors: Number(row.unique_visitors) || 0,
            unique_visitors_prev: Number(row.unique_visitors_prev) || 0,
            page_views: Number(row.page_views) || 0,
            page_views_prev: Number(row.page_views_prev) || 0,
            views_per_visit: Number(row.views_per_visit) || 0,
            views_per_visit_prev: Number(row.views_per_visit_prev) || 0,
            avg_duration_ms: Number(row.avg_duration_ms) || 0,
            avg_duration_ms_prev: Number(row.avg_duration_ms_prev) || 0,
            bounce_rate: Number(row.bounce_rate) || 0,
            bounce_rate_prev: Number(row.bounce_rate_prev) || 0,
            daily_stats: dailyData.map((d: any) => ({
              date: new Date(d.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
              visitas: d.visitas || 0,
              usuarios: d.usuarios || 0
            }))
          });
        } else {
          setOverview({
            unique_visitors: 0,
            unique_visitors_prev: 0,
            page_views: 0,
            page_views_prev: 0,
            views_per_visit: 0,
            views_per_visit_prev: 0,
            avg_duration_ms: 0,
            avg_duration_ms_prev: 0,
            bounce_rate: 0,
            bounce_rate_prev: 0,
            daily_stats: []
          });
        }

        if (pagesRes.data) {
          setTopPages(pagesRes.data.map((p: any) => ({
            page_path: p.page_path,
            page_name: p.page_name,
            views: Number(p.views) || 0,
            percentage: Number(p.percentage) || 0
          })));
        }

        if (devicesRes.data) {
          setDeviceStats(devicesRes.data.map((d: any) => ({
            device_type: d.device_type,
            visits: Number(d.visits) || 0,
            percentage: Number(d.percentage) || 0
          })));
        }

        if (countriesRes.data) {
          setCountryStats(countriesRes.data.map((c: any) => ({
            country: c.country,
            visits: Number(c.visits) || 0,
            percentage: Number(c.percentage) || 0
          })));
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchAnalytics();
    }
  }, [period, isAdmin]);

  if (roleLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <LoaderHourglass label="Preparando panel de analytics" />
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

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Monitor;
      default:
        return Monitor;
    }
  };

  const getDeviceName = (type: string) => {
    switch (type) {
      case 'mobile':
        return 'Móvil';
      case 'tablet':
        return 'Tablet';
      default:
        return 'Escritorio';
    }
  };

  return (
    <div className="page-container">
      <PageHeader 
        title="Analytics" 
        description="Métricas de uso y rendimiento de la aplicación"
        action={
          <Button variant="outline" size="sm" onClick={() => navigate('/hub')}>
            Volver a módulos
          </Button>
        }
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
      ) : overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KPICard
            title="Visitantes únicos"
            value={overview.unique_visitors.toLocaleString()}
            change={calcChange(overview.unique_visitors, overview.unique_visitors_prev)}
            icon={<Users className="w-6 h-6" />}
            delay={0}
          />
          <KPICard
            title="Páginas vistas"
            value={overview.page_views.toLocaleString()}
            change={calcChange(overview.page_views, overview.page_views_prev)}
            icon={<Eye className="w-6 h-6" />}
            delay={0.1}
          />
          <KPICard
            title="Vistas por visita"
            value={overview.views_per_visit}
            change={calcChange(overview.views_per_visit, overview.views_per_visit_prev)}
            icon={<MousePointerClick className="w-6 h-6" />}
            delay={0.2}
          />
          <KPICard
            title="Duración promedio"
            value={formatDuration(overview.avg_duration_ms)}
            change={calcChange(overview.avg_duration_ms, overview.avg_duration_ms_prev)}
            icon={<Clock className="w-6 h-6" />}
            delay={0.3}
          />
          <KPICard
            title="Tasa de rebote"
            value={`${overview.bounce_rate}%`}
            change={calcChange(overview.bounce_rate, overview.bounce_rate_prev)}
            icon={<Percent className="w-6 h-6" />}
            delay={0.4}
          />
        </div>
      )}

      {/* Main Chart */}
      {loading ? (
        <SkeletonChart />
      ) : overview && (
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
          
          {overview.daily_stats.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={overview.daily_stats}>
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
          ) : (
            <div className="h-72 flex items-center justify-center text-muted-foreground">
              No hay datos de visitas para este período
            </div>
          )}
          
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
          
          {topPages.length > 0 ? (
            <div className="space-y-3">
              {topPages.map((page, index) => (
                <div key={page.page_path} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{page.page_name}</span>
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
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay datos de páginas</p>
          )}
        </motion.div>

        {/* Devices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
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
          
          {deviceStats.length > 0 ? (
            <div className="space-y-4">
              {deviceStats.map((item) => {
                const Icon = getDeviceIcon(item.device_type);
                return (
                  <div key={item.device_type} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{getDeviceName(item.device_type)}</span>
                        <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${item.percentage}%`,
                            backgroundColor: item.device_type === 'desktop' ? PRIMARY_COLOR : SUCCESS_COLOR
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
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay datos de dispositivos</p>
          )}
        </motion.div>

        {/* Countries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="stat-card lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Países</h3>
              <p className="text-sm text-muted-foreground">Ubicación de los visitantes</p>
            </div>
          </div>
          
          {countryStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {countryStats.map((item) => (
                <div key={item.country} className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                    {countryFlags[item.country] || '🌐'}
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
          ) : (
            <p className="text-muted-foreground text-center py-8">No hay datos de países</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

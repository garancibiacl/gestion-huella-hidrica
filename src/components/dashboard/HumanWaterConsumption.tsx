import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  Package,
  Building2,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonCard, SkeletonChart } from '@/components/ui/skeleton-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';

interface HumanWaterData {
  id: string;
  period: string;
  centro_trabajo: string;
  faena: string | null;
  formato: 'botella' | 'bidon_20l';
  cantidad: number;
  total_costo: number | null;
  proveedor: string | null;
}

interface ChartData {
  centro: string;
  botellas: number;
  bidones: number;
  costo: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function HumanWaterConsumption() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HumanWaterData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedCentro, setSelectedCentro] = useState<string>('all');
  const [selectedFaena, setSelectedFaena] = useState<string>('all');
  const [periods, setPeriods] = useState<string[]>([]);
  const [centros, setCentros] = useState<string[]>([]);
  const [faenas, setFaenas] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: consumptionData, error } = await supabase
        .from('human_water_consumption')
        .select('*')
        .order('period', { ascending: false });

      if (error) throw error;

      if (consumptionData) {
        const typedData = consumptionData.map(item => ({
          ...item,
          formato: item.formato as 'botella' | 'bidon_20l'
        }));
        setData(typedData);
        
        // Extract unique periods, centros and faenas
        const uniquePeriods = [...new Set(consumptionData.map(d => d.period))].sort().reverse();
        const uniqueCentros = [...new Set(consumptionData.map(d => d.centro_trabajo))].sort();
        const uniqueFaenas = [...new Set(consumptionData.map(d => d.faena).filter(Boolean) as string[])].sort();
        setPeriods(uniquePeriods);
        setCentros(uniqueCentros);
        setFaenas(uniqueFaenas);
      }
    } catch (error) {
      console.error('Error fetching human water data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(d => {
    if (selectedPeriod !== 'all' && d.period !== selectedPeriod) return false;
    if (selectedCentro !== 'all' && d.centro_trabajo !== selectedCentro) return false;
    if (selectedFaena !== 'all' && d.faena !== selectedFaena) return false;
    return true;
  });

  // Calculate totals
  const totalBotellas = filteredData
    .filter(d => d.formato === 'botella')
    .reduce((sum, d) => sum + Number(d.cantidad), 0);
  
  const totalBidones = filteredData
    .filter(d => d.formato === 'bidon_20l')
    .reduce((sum, d) => sum + Number(d.cantidad), 0);
  
  const totalCosto = filteredData.reduce((sum, d) => sum + (Number(d.total_costo) || 0), 0);

  // Total liters (assuming 500ml bottles and 20L jugs)
  const totalLitros = (totalBotellas * 0.5) + (totalBidones * 20);

  // Chart data by centro
  const chartByCentro: ChartData[] = centros.map(centro => {
    const centroData = filteredData.filter(d => d.centro_trabajo === centro);
    return {
      centro: centro.length > 15 ? centro.substring(0, 12) + '...' : centro,
      botellas: centroData.filter(d => d.formato === 'botella').reduce((sum, d) => sum + Number(d.cantidad), 0),
      bidones: centroData.filter(d => d.formato === 'bidon_20l').reduce((sum, d) => sum + Number(d.cantidad), 0),
      costo: centroData.reduce((sum, d) => sum + (Number(d.total_costo) || 0), 0)
    };
  }).filter(d => d.botellas > 0 || d.bidones > 0);

  // Pie data for format distribution
  const pieData = [
    { name: 'Botellas', value: totalBotellas, litros: totalBotellas * 0.5 },
    { name: 'Bidones 20L', value: totalBidones, litros: totalBidones * 20 }
  ].filter(d => d.value > 0);

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  if (loading) {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonChart />
      </>
    );
  }

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="stat-card flex flex-col items-center justify-center py-12"
      >
        <Droplets className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sin datos de consumo humano</h3>
        <p className="text-muted-foreground text-center mb-4 max-w-md">
          Aún no hay registros de consumo de agua para consumo humano. 
          Importa datos desde tu archivo Excel.
        </p>
        <Link to="/importar">
          <Button className="gap-2">
            <Upload className="w-4 h-4" />
            Importar datos
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <>
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-3 mb-6"
      >
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los períodos</SelectItem>
            {periods.map(p => (
              <SelectItem key={p} value={p}>{formatPeriod(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedCentro} onValueChange={setSelectedCentro}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Centro de trabajo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los centros</SelectItem>
            {centros.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {faenas.length > 0 && (
          <Select value={selectedFaena} onValueChange={setSelectedFaena}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Faena" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las faenas</SelectItem>
              {faenas.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Botellas"
          value={totalBotellas.toLocaleString()}
          icon={<Package className="w-5 h-5" />}
          subtitle={`${(totalBotellas * 0.5).toLocaleString()} litros`}
          delay={0}
        />
        <StatCard
          title="Total Bidones 20L"
          value={totalBidones.toLocaleString()}
          icon={<Droplets className="w-5 h-5" />}
          subtitle={`${(totalBidones * 20).toLocaleString()} litros`}
          delay={0.1}
        />
        <StatCard
          title="Costo Total"
          value={`$${totalCosto.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          delay={0.2}
        />
        <StatCard
          title="Centros de Trabajo"
          value={centros.length.toString()}
          icon={<Building2 className="w-5 h-5" />}
          subtitle={`${totalLitros.toLocaleString()} L totales`}
          delay={0.3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Bar chart by centro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="stat-card"
        >
          <h3 className="font-semibold mb-1">Consumo por Centro de Trabajo</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Distribución de botellas y bidones
          </p>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartByCentro} layout="vertical">
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis 
                  type="category" 
                  dataKey="centro" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={11}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
                  }}
                />
                <Legend />
                <Bar dataKey="botellas" name="Botellas" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="bidones" name="Bidones 20L" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie chart for format distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="stat-card"
        >
          <h3 className="font-semibold mb-1">Distribución por Formato</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Proporción de botellas vs bidones
          </p>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value.toLocaleString()} unidades (${props.payload.litros.toLocaleString()}L)`,
                    name
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Summary by period */}
      {selectedPeriod === 'all' && periods.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="stat-card"
        >
          <h3 className="font-semibold mb-1">Evolución Mensual</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Tendencia de consumo humano por período
          </p>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={periods.slice(0, 12).reverse().map(period => {
                  const periodData = data.filter(d => d.period === period);
                  return {
                    period: formatPeriod(period),
                    botellas: periodData.filter(d => d.formato === 'botella').reduce((sum, d) => sum + Number(d.cantidad), 0),
                    bidones: periodData.filter(d => d.formato === 'bidon_20l').reduce((sum, d) => sum + Number(d.cantidad), 0),
                    costo: periodData.reduce((sum, d) => sum + (Number(d.total_costo) || 0), 0)
                  };
                })}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)',
                  }}
                />
                <Legend />
                <Bar dataKey="botellas" name="Botellas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="bidones" name="Bidones 20L" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}
    </>
  );
}

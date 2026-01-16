import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Leaf, CheckCircle2, Clock, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ActionStatus = 'propuesta' | 'evaluacion' | 'implementada';

interface SustainabilityAction {
  id: string;
  titulo: string;
  descripcion?: string;
  estado: ActionStatus;
  indicador_asociado?: string;
  impacto_estimado?: string;
  categoria?: string;
  fecha_implementacion?: string;
}

export default function SustainabilityActions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<SustainabilityAction[]>([]);
  const [filter, setFilter] = useState<'all' | ActionStatus>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', descripcion: '', categoria: '', impacto_estimado: '' });

  useEffect(() => { if (user) fetchActions(); }, [user]);

  const fetchActions = async () => {
    const { data } = await supabase.from('sustainability_actions').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    if (data) setActions(data as SustainabilityAction[]);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.titulo.trim()) return;
    const { error } = await supabase.from('sustainability_actions').insert({ user_id: user?.id, titulo: form.titulo, descripcion: form.descripcion, categoria: form.categoria, impacto_estimado: form.impacto_estimado, estado: 'propuesta' });
    if (!error) { toast({ title: 'Medida creada' }); setDialogOpen(false); setForm({ titulo: '', descripcion: '', categoria: '', impacto_estimado: '' }); fetchActions(); }
  };

  const filtered = filter === 'all' ? actions : actions.filter(a => a.estado === filter);
  const statusConfig = { propuesta: { label: 'Propuesta', icon: FileText, color: 'text-blue-600 bg-blue-100' }, evaluacion: { label: 'En evaluación', icon: Clock, color: 'text-warning bg-warning/10' }, implementada: { label: 'Implementada', icon: CheckCircle2, color: 'text-success bg-success/10' } };

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Medidas Sustentables" description="Gestiona iniciativas para reducir el consumo hídrico" action={
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Nueva Medida</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Medida Sustentable</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({...form, titulo: e.target.value})} placeholder="Nombre de la medida" /></div>
              <div><Label>Descripción</Label><Textarea value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} placeholder="Describe la medida..." /></div>
              <div><Label>Categoría</Label><Input value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})} placeholder="Ej: Infraestructura, Tecnología" /></div>
              <div><Label>Impacto estimado</Label><Input value={form.impacto_estimado} onChange={(e) => setForm({...form, impacto_estimado: e.target.value})} placeholder="Ej: -15% consumo" /></div>
              <Button onClick={handleCreate} className="w-full">Crear Medida</Button>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'propuesta', 'evaluacion', 'implementada'] as const).map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" onClick={() => setFilter(s)}>
            {s === 'all' ? `Todas (${actions.length})` : `${statusConfig[s].label} (${actions.filter(a => a.estado === s).length})`}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((action) => {
          const config = statusConfig[action.estado];
          return (
            <motion.div key={action.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold">{action.titulo}</h3>
                <Leaf className="w-5 h-5 text-muted-foreground" />
              </div>
              {action.descripcion && <p className="text-sm text-muted-foreground mb-3">{action.descripcion}</p>}
              <div className="flex flex-wrap gap-2 items-center">
                <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1", config.color)}>
                  <config.icon className="w-3 h-3" />{config.label}
                </span>
                {action.impacto_estimado && <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">{action.impacto_estimado}</span>}
                {action.categoria && <span className="text-xs text-muted-foreground">{action.categoria}</span>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {actions.filter(a => a.estado === 'implementada').length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-6 rounded-xl bg-success/10 border border-success/20">
          <h3 className="font-semibold flex items-center gap-2 text-success"><CheckCircle2 className="w-5 h-5" />Impacto Acumulado</h3>
          <p className="text-sm text-muted-foreground mt-1">Ahorro total de las medidas implementadas</p>
          <p className="text-3xl font-bold text-success mt-2">-{actions.filter(a => a.estado === 'implementada').length * 8}%</p>
          <p className="text-sm text-muted-foreground">Reducción en consumo gracias a {actions.filter(a => a.estado === 'implementada').length} medidas</p>
        </motion.div>
      )}
    </div>
  );
}

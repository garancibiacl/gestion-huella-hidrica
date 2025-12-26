import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, Target, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    umbral_alerta_pct: 15,
    objetivo_mensual: 1000,
    reduccion_anual_pct: 10,
    email_notificaciones: '',
    notificaciones_email: false,
    informes_mensuales: false,
  });

  useEffect(() => {
    if (user) fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('measurement_criteria').select('*').eq('user_id', user?.id).maybeSingle();
    if (data) setSettings({
      umbral_alerta_pct: Number(data.umbral_alerta_pct) || 15,
      objetivo_mensual: Number(data.objetivo_mensual) || 1000,
      reduccion_anual_pct: Number(data.reduccion_anual_pct) || 10,
      email_notificaciones: data.email_notificaciones || '',
      notificaciones_email: data.notificaciones_email || false,
      informes_mensuales: data.informes_mensuales || false,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.from('measurement_criteria').upsert({ user_id: user?.id, ...settings }, { onConflict: 'user_id' });
    setLoading(false);
    if (!error) toast({ title: 'Configuración guardada' });
    else toast({ variant: 'destructive', title: 'Error al guardar' });
  };

  return (
    <div className="page-container">
      <PageHeader title="Configuración" description="Personaliza alertas y parámetros del sistema" />

      <div className="space-y-6 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
          <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-warning" /><h3 className="font-semibold">Alertas de Consumo</h3></div>
          <p className="text-sm text-muted-foreground mb-4">Configura cuándo recibir notificaciones sobre consumo elevado</p>
          <div className="space-y-4">
            <div>
              <Label>Umbral de alerta (% de variación)</Label>
              <Input type="number" value={settings.umbral_alerta_pct} onChange={(e) => setSettings({...settings, umbral_alerta_pct: Number(e.target.value)})} className="mt-1 w-32" />
              <p className="text-xs text-muted-foreground mt-1">Alerta cuando el consumo supere este porcentaje vs promedio</p>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="stat-card">
          <div className="flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-primary" /><h3 className="font-semibold">Notificaciones</h3></div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-sm">Notificaciones por correo</p><p className="text-xs text-muted-foreground">Recibe alertas importantes en tu email</p></div>
              <Switch checked={settings.notificaciones_email} onCheckedChange={(c) => setSettings({...settings, notificaciones_email: c})} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-sm">Informes mensuales</p><p className="text-xs text-muted-foreground">Resumen automático de consumo cada mes</p></div>
              <Switch checked={settings.informes_mensuales} onCheckedChange={(c) => setSettings({...settings, informes_mensuales: c})} />
            </div>
            <div><Label>Correo electrónico</Label><Input type="email" value={settings.email_notificaciones} onChange={(e) => setSettings({...settings, email_notificaciones: e.target.value})} placeholder="gestion@busesjm.cl" className="mt-1" /></div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stat-card">
          <div className="flex items-center gap-2 mb-4"><Target className="w-5 h-5 text-success" /><h3 className="font-semibold">Objetivos de Consumo</h3></div>
          <p className="text-sm text-muted-foreground mb-4">Define tus metas de reducción de huella hídrica</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Objetivo mensual (m³)</Label><Input type="number" value={settings.objetivo_mensual} onChange={(e) => setSettings({...settings, objetivo_mensual: Number(e.target.value)})} className="mt-1" /></div>
            <div><Label>Reducción anual objetivo (%)</Label><Input type="number" value={settings.reduccion_anual_pct} onChange={(e) => setSettings({...settings, reduccion_anual_pct: Number(e.target.value)})} className="mt-1" /></div>
          </div>
        </motion.div>

        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto"><Save className="w-4 h-4 mr-2" />{loading ? 'Guardando...' : 'Guardar cambios'}</Button>
      </div>
    </div>
  );
}

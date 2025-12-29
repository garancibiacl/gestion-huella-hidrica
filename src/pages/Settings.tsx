import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Bell, Target, Save, User, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
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
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [settings, setSettings] = useState({
    umbral_alerta_pct: 15,
    objetivo_mensual: 1000,
    reduccion_anual_pct: 10,
    email_notificaciones: '',
    notificaciones_email: false,
    informes_mensuales: false,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSettings();
    }
  }, [user]);

  const fetchProfile = async () => {
    setProfileLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user?.id)
        .maybeSingle();

      const fullName = data?.full_name || '';
      const parts = fullName.split(' ').filter(Boolean);
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(data?.email || user?.email || '');
    } catch (error) {
      console.error('Error fetching profile', error);
    } finally {
      setProfileLoading(false);
    }
  };

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

  const handleSaveProfile = async () => {
    if (!user || !organizationId) {
      toast({ variant: 'destructive', title: 'No se pudo determinar la organización del usuario' });
      return;
    }
    setProfileLoading(true);
    try {
      const full_name = [firstName, lastName].filter(Boolean).join(' ').trim() || null;

      const { error } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            organization_id: organizationId,
            full_name,
            email: email || user.email,
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      // Update auth metadata so the sidebar avatar reflects the new name
      await supabase.auth.updateUser({
        data: {
          full_name: full_name || undefined,
        },
      });

      toast({ title: 'Perfil actualizado' });
    } catch (error) {
      console.error('Error updating profile', error);
      toast({ variant: 'destructive', title: 'Error al actualizar perfil' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Ingresa un correo para restablecer la contraseña' });
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/auth',
      });
      if (error) throw error;
      toast({ title: 'Correo de restablecimiento enviado', description: 'Revisa tu bandeja de entrada.' });
    } catch (error) {
      console.error('Error sending reset email', error);
      toast({ variant: 'destructive', title: 'No se pudo enviar el correo de restablecimiento' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Configuración" description="Datos de tu cuenta y parámetros del sistema" />

      <div className="space-y-6 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="stat-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Perfil de usuario</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Actualiza tu nombre, apellido y correo electrónico.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nombre"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Apellido"
                className="mt-1"
              />
            </div>
          </div>
          <div className="mb-4">
            <Label>Correo electrónico</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@busesjm.cl"
              className="mt-1"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center mt-4">
            <Button
              onClick={handleSaveProfile}
              disabled={profileLoading}
              className="w-full sm:w-auto"
            >
              <Save className="w-4 h-4 mr-2" />
              {profileLoading ? 'Guardando perfil...' : 'Guardar perfil'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="w-full sm:w-auto gap-2"
            >
              <KeyRound className="w-4 h-4" />
              {resetLoading ? 'Enviando enlace...' : 'Restablecer contraseña'}
            </Button>
          </div>
        </motion.div>
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

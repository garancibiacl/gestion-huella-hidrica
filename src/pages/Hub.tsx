import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Loader2, Droplets, Shield } from "lucide-react";
import { ModuleCard } from "@/components/hub/ModuleCard";
import { WelcomeHeader } from "@/components/hub/WelcomeHeader";
import { AdminQuickActions } from "@/components/hub/AdminQuickActions";

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  path: string;
  roles: string[];
  gradient: string;
  accentColor: string;
}

const MODULES: Module[] = [
  {
    id: "environmental",
    title: "Gestión Ambiental",
    description: "Controla consumo de agua y energía, detecta riesgos y mejora tu huella.",
    icon: <Droplets className="w-8 h-8" />,
    features: [
      "Monitoreo de Agua, Energía y Petróleo",
      "Alertas y gestión de riesgos ambientales",
      "Paneles e informes de cumplimiento",
      "Históricos por centro / faena",
    ],
    path: "/dashboard/agua",
    roles: ["admin", "prevencionista", "worker"],
    gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
    accentColor: "#10b981",
  },
  {
    id: "pam",
    title: "Gestión de Seguridad",
    description: "Planificación, asignación y seguimiento semanal de tareas de seguridad y medioambientales (PAM).",
    icon: <Shield className="w-8 h-8" />,
    features: [
      "Carga semanal desde Excel",
      "Asignación automática por responsable",
      "Seguimiento, evidencias y reportes",
      "Dashboard ejecutivo y cumplimiento",
    ],
    path: "/pam/my-activities",
    roles: ["admin", "prevencionista", "worker"],
    gradient: "bg-gradient-to-br from-red-500 to-orange-600",
    accentColor: "#ef4444",
  },
];

export default function Hub() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { organizationId, loading: orgLoading } = useOrganization();
  const { profile, loading: profileLoading } = useUserProfile();

  const loading = authLoading || orgLoading || profileLoading;

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  const availableModules = MODULES.filter((module) => {
    if (!profile?.role) return false;
    return module.roles.includes(profile.role);
  });

  useEffect(() => {
    if (!loading && availableModules.length === 1) {
      navigate(availableModules[0].path, { replace: true });
    }
  }, [loading, availableModules, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !organizationId) {
    return null;
  }

  if (availableModules.length === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Usuario';
  const userRole = profile?.role || 'worker';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-gray-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Welcome Header */}
        <WelcomeHeader
          userName={userName}
          userRole={userRole}
          lastConnection={profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) : undefined}
        />

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {availableModules.map((module, index) => (
            <ModuleCard
              key={module.id}
              id={module.id}
              title={module.title}
              description={module.description}
              icon={module.icon}
              features={module.features}
              path={module.path}
              gradient={module.gradient}
              accentColor={module.accentColor}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Admin Quick Actions */}
        {profile?.role === "admin" && <AdminQuickActions />}

        {/* Footer Info */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Plataforma JM · Gestión Integrada de Medio Ambiente y Seguridad</p>
          <p className="mt-1">Somos especialistas en faenas mineras. Conectamos colaboradores entre V y II región.</p>
        </div>
      </div>
    </div>
  );
}

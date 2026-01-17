import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Loader2, Droplets, Shield } from "lucide-react";
import { ModuleCard } from "@/components/hub/ModuleCard";
import { AdminQuickActions } from "@/components/hub/AdminQuickActions";
import { PamNotificationBell } from "@/modules/pam/components/notifications/PamNotificationBell";
import { HazardNotificationBell } from "@/modules/pam/hazards/components/HazardNotificationBell";

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
  badge?: string;
  badgeColor?: string;
}

const MODULES: Module[] = [
  {
    id: "environmental",
    title: "Gestión Ambiental",
    description: "Control exhaustivo de indicadores críticos de consumo y monitoreo de impacto ambiental en tiempo real.",
    icon: <Droplets className="w-8 h-8" />,
    features: [
      "Monitoreo de Agua, Energía y Petróleo",
      "Alertas de riesgos ambientales críticos",
      "Informes de cumplimiento normativo",
    ],
    path: "/dashboard/agua",
    roles: ["admin", "prevencionista", "worker"],
    gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
    accentColor: "#10b981",
    badge: "USO FRECUENTE",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "pam",
    title: "Gestión de Tareas (PAM)",
    description: "Planificación estratégica y seguimiento semanal del Programa Anual de tareas HSE corporativas.",
    icon: <Shield className="w-8 h-8" />,
    features: [
      "Sincronización masiva desde Excel",
      "Asignación por niveles jerárquicos",
      "Gestión documental de evidencias",
    ],
    path: "/admin/pls/hazard-report",
    roles: ["admin", "prevencionista", "worker"],
    gradient: "bg-gradient-to-br from-red-500 to-orange-600",
    accentColor: "#ae3f34",
    badge: "ACTUALIZADO",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
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
      <div className="flex items-center justify-center min-h-screen bg-[#F4F5F7]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !organizationId) {
    return null;
  }

  if (availableModules.length === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F5F7]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Usuario';
  const userRole = profile?.role || 'worker';
  const userDisplayName = profile?.full_name || user.email || 'Usuario JM';
  const userInitials = userDisplayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'JM';

  const roleLabelMap: Record<string, string> = {
    admin: 'ADMINISTRADOR SENIOR',
    prevencionista: 'SUPERVISIÓN',
    worker: 'TRABAJADOR',
  };

  const userRoleLabel = roleLabelMap[userRole] || 'USUARIO';

  const currentDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Top Platform Header */}
        <div className="mb-10 flex items-center justify-between gap-4 rounded-2xl bg-white border border-gray-100 px-6 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
          {/* Logo + Platform Name */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#ae3f34] flex items-center justify-center shadow-sm overflow-hidden">
              <img
                src="/images/logo.png"
                alt="Plataforma JM"
                className="h-7 w-7 object-contain"
                loading="lazy"
              />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold tracking-[0.16em] text-gray-900 uppercase">
                PLATAFORMA JM
              </p>
              <p className="text-[11px] text-gray-500 tracking-wide">
                GESTIÓN CORPORATIVA HSE
              </p>
            </div>
          </div>

          {/* Right side: system status + notifications + user */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-100 bg-emerald-50 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>SISTEMA OPERATIVO</span>
            </div>

            <div className="flex items-center gap-2">
              <HazardNotificationBell />
              <PamNotificationBell />
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-semibold text-gray-900 max-w-[180px] truncate">
                  {userDisplayName}
                </span>
                <span className="text-[11px] font-semibold tracking-wide text-[#ae3f34] uppercase">
                  {userRoleLabel}
                </span>
              </div>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center text-xs font-bold text-[#ae3f34] border-2 border-white shadow-sm">
                {userInitials}
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-3">
            Bienvenido, <span className="font-bold text-[#ae3f34]">{userName}</span>
          </h1>
          <p className="text-gray-600 text-lg font-medium max-w-2xl mx-auto">
            Panel de Selección de Módulos Operativos. Elija el entorno de gestión que desea supervisar hoy.
          </p>
        </div>

        {/* Context Bar */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="flex flex-wrap items-center justify-between bg-white border border-gray-200 px-8 py-4 rounded-2xl shadow-sm">
            <div className="flex items-center space-x-3 text-gray-700">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50">
                <Shield className="w-4 h-4 text-[#ae3f34]" />
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Rol de Acceso:</span>
                <span className="text-sm font-bold text-gray-900">{userRoleLabel}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-gray-700">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Sesión Actual:</span>
                <span className="text-sm font-bold text-gray-900">{currentDate} | {currentTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 max-w-6xl mx-auto">
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
              badge={module.badge}
              badgeColor={module.badgeColor}
              delay={index * 0.1}
            />
          ))}
        </div>

        {/* Admin Quick Actions */}
        {profile?.role === "admin" && <AdminQuickActions />}

        {/* Footer Info */}
        <div className="mt-16 text-center text-sm text-gray-500 space-y-4">
          <p className="font-medium">PLATAFORMA INTEGRADA JM © 2024</p>
          <p>
            Diseñada para anticipar riesgos y acelerar decisiones responsables · Desarrollador{' '}
            <a
              href="https://portafolio-gus.netlify.app"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-gray-700 hover:text-gray-900 underline underline-offset-4"
            >
              Gustavo Arancibia
            </a>
          </p>
          <div className="flex items-center justify-center space-x-8 text-xs">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              <span>BUSLARM SYSTEMS</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
              </svg>
              <span>INFRASTRUCTURE HUB</span>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-4 text-xs pt-2">
            <button className="flex items-center space-x-1 px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
              <span className="inline-block w-5 h-3 rounded-sm border border-gray-300 overflow-hidden">
                <span className="block h-1/2 bg-red-600"></span>
                <span className="block h-1/2 bg-white"></span>
              </span>
              <span>ESPAÑOL (CL)</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button className="flex items-center justify-center w-7 h-7 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

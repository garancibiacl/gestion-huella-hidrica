import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Droplets, Shield, Settings, HelpCircle, LogOut, ChevronDown, BarChart3, Users } from "lucide-react";
import { ModuleCard } from "@/components/hub/ModuleCard";
import { PamNotificationBell } from "@/modules/pam/components/notifications/PamNotificationBell";
import { HazardNotificationBell } from "@/modules/pam/hazards/components/HazardNotificationBell";
import { Button } from "@/components/ui/button";
import { LoaderHourglass } from "@/components/ui/loader-hourglass";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    badge: "USO FRECUENTE",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    id: "pam",
    title: "Gestión de Seguridad",
    description: "Planificación, asignación y seguimiento semanal de tareas de seguridad y medioambientales (PLS).",
    icon: <Shield className="w-8 h-8" />,
    features: [
      "Carga semanal desde Excel",
      "Asignación automática por responsable",
      "Seguimiento, evidencias y reportes",
      "Dashboard ejecutivo y cumplimiento",
    ],
    path: "/admin/pls/hazard-report",
    roles: ["admin", "prevencionista", "worker"],
    gradient: "bg-gradient-to-br from-red-500 to-orange-600",
    accentColor: "#ae3f34",
    badge: "ACTUALIZADO",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
  },
  {
    id: "admin-analytics",
    title: "Analytics de Plataforma",
    description: "Métricas de uso, tráfico y rendimiento de la plataforma HSE.",
    icon: <BarChart3 className="w-8 h-8" />,
    features: [
      "Visitas y usuarios únicos",
      "Páginas más vistas",
      "Dispositivos y países",
      "Tendencias por período",
    ],
    path: "/hub/analytics",
    roles: ["admin"],
    gradient: "bg-gradient-to-br from-indigo-500 to-sky-600",
    accentColor: "#4f46e5",
    badge: "ADMIN",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    id: "admin-users",
    title: "Gestión de Usuarios",
    description: "Administra cuentas, roles y accesos de toda la organización.",
    icon: <Users className="w-8 h-8" />,
    features: [
      "Crear y editar usuarios",
      "Asignar roles y permisos",
      "Resumen de cuentas activas",
      "Panel de administración centralizada",
    ],
    path: "/hub/users",
    roles: ["admin"],
    gradient: "bg-gradient-to-br from-slate-600 to-slate-800",
    accentColor: "#0f172a",
    badge: "ADMIN",
    badgeColor: "bg-slate-50 text-slate-800 border-slate-200",
  },
];

export default function Hub() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
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
        <LoaderHourglass label="Cargando módulos..." size={40} />
      </div>
    );
  }

  if (!user || !organizationId) {
    return null;
  }

  if (availableModules.length === 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F5F7]">
        <LoaderHourglass label="Cargando módulos..." size={40} />
      </div>
    );
  }

  const formatDisplayName = (value: string) => {
    if (!value) return 'Usuario';
    if (value.includes('@')) return value.split('@')[0];
    return value
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const userDisplayName = formatDisplayName(profile?.full_name || user.email || 'Usuario JM');
  const userName = userDisplayName.split(' ')[0] || 'Usuario';
  const userRole = profile?.role || 'worker';
  const isAdmin = userRole === 'admin';
  
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

  const handleSignOut = async () => {
    await signOut();
  };

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
            <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm overflow-hidden">
              <img
                src="/images/logo.png"
                alt="Buses JM"
                className="h-8 w-8 object-contain"
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

          {/* Right side */}
          <div className="flex items-center gap-4 md:gap-6">
            <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-100 bg-emerald-50 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>ACTIVO</span>
            </div>

            {/* Notificaciones */}
            <div className="flex items-center gap-1">
              <HazardNotificationBell />
              <PamNotificationBell />
            </div>

            {/* Menú de usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-10 px-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50"
                >
                  <div className="hidden sm:flex flex-col items-end leading-tight">
                    <span className="text-sm font-semibold text-gray-900 max-w-[180px] truncate">
                      {userDisplayName}
                    </span>
                    <span className="text-[11px] font-semibold tracking-wide text-[#ae3f34] uppercase">
                      {userRoleLabel}
                    </span>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-100 to-amber-200 flex items-center justify-center text-xs font-bold text-[#ae3f34] border-2 border-white shadow-sm flex-shrink-0">
                    {userInitials}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userDisplayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground mt-1">
                      {userRoleLabel}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/configuracion" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/ayuda" className="flex items-center">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Centro de ayuda</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Welcome Section */}
        <div className={isAdmin ? "text-left mb-8" : "text-center mb-12"}>
          <h1 className={isAdmin ? "text-3xl md:text-4xl font-light text-gray-900 mb-2" : "text-4xl md:text-5xl font-light text-gray-900 mb-3"}>
            Bienvenido, <span className="font-bold text-[#ae3f34]">{userName}</span>
          </h1>
          <p className={isAdmin ? "text-gray-600 text-base font-medium max-w-3xl" : "text-gray-600 text-lg font-medium max-w-2xl mx-auto"}>
            {isAdmin
              ? "Vista administrativa para supervisión rápida de módulos y control de la plataforma."
              : "Panel de Selección de Módulos Operativos. Elija el entorno de gestión que desea supervisar hoy."
            }
          </p>
        </div>

        {/* Context Bar */}
        <div className={isAdmin ? "max-w-5xl mx-auto mb-10" : "max-w-3xl mx-auto mb-16"}>
          <div className={isAdmin ? "flex flex-wrap items-center justify-between bg-white border border-gray-200 px-6 py-3 rounded-2xl shadow-sm" : "flex flex-wrap items-center justify-between bg-white border border-gray-200 px-8 py-4 rounded-2xl shadow-sm"}>
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
        <div className={isAdmin ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8 max-w-7xl mx-auto" : "grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 max-w-6xl mx-auto"}>
          {availableModules.map((module, index) => (
            <ModuleCard
              key={module.id}
              id={module.id}
              title={module.title}
              description={module.description}
              icon={module.icon}
              features={isAdmin ? module.features.slice(0, 2) : module.features}
              path={module.path}
              gradient={module.gradient}
              accentColor={module.accentColor}
              badge={module.badge}
              badgeColor={module.badgeColor}
              delay={index * 0.1}
              size={isAdmin ? "compact" : "default"}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-gray-500 space-y-4">
          <p className="font-medium">PLATAFORMA INTEGRADA JM © 2026</p>
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
        </div>
      </div>
    </div>
  );
}

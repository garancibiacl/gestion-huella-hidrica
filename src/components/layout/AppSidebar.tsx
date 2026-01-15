import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Upload,
  Calendar,
  Leaf,
  Droplets,
  Zap,
  Users,
  BarChart3,
  PanelLeft,
  PanelRightOpen,
  Flame,
  AlertTriangle,
  ClipboardList,
  CheckSquare,
  TrendingUp,
  FileText,
  LayoutDashboard,
  Home,
} from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  icon: typeof Droplets;
  label: string;
  path: string;
  adminOnly?: boolean;
  pamAdminOnly?: boolean;
}

// Navegación para Módulo Ambiental
const environmentalNavItems: NavItem[] = [
  { icon: Droplets, label: "Agua", path: "/dashboard/agua" },
  { icon: Zap, label: "Energía Eléctrica", path: "/dashboard/energia" },
  { icon: Flame, label: "Petróleo", path: "/dashboard/petroleo" },
  { icon: Upload, label: "Importar Datos", path: "/importar" },
  { icon: Calendar, label: "Períodos", path: "/periodos" },
  { icon: Leaf, label: "Medidas Sustentables", path: "/medidas" },
  { icon: Users, label: "Usuarios", path: "/admin/usuarios", adminOnly: true },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics", adminOnly: true },
];

// Navegación para Módulo PLS (Gestión de Seguridad)
// Basado en estructura Codelco/Zyght
const pamNavItems: NavItem[] = [
  { icon: AlertTriangle, label: "Reporte de Peligro", path: "/admin/pls/hazard-report", pamAdminOnly: true },
  { icon: BarChart3, label: "Dashboard de Peligros", path: "/pls/hazard-dashboard", pamAdminOnly: true },
  { icon: ClipboardList, label: "Mis actividades", path: "/pls/my-activities" },
  { icon: LayoutDashboard, label: "Dashboard PLS", path: "/pls/dashboard", pamAdminOnly: true },
  { icon: Upload, label: "Planificación semanal PLS", path: "/admin/pls/upload", pamAdminOnly: true },
  { icon: CheckSquare, label: "Estado de cumplimiento", path: "/admin/pls/board", pamAdminOnly: true },
  { icon: TrendingUp, label: "Desempeño del PLS", path: "/pls/performance", pamAdminOnly: true },
  { icon: FileText, label: "Reportabilidad", path: "/pls/reports", pamAdminOnly: true },
];

interface AppSidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({ onClose, isCollapsed = false, onToggleCollapse }: AppSidebarProps) {
  const location = useLocation();
  const { isAdmin, isPrevencionista, loading } = useRole();

  // Detectar si estamos en módulo PLS o Ambiental
  const isPamModule = location.pathname.startsWith('/pls') || location.pathname.startsWith('/admin/pls');
  const navItems = isPamModule ? pamNavItems : environmentalNavItems;


  const filteredNavItems = navItems.filter((item) => {
    // Ítems solo admin
    if (item.adminOnly && !isAdmin) {
      return false;
    }

    // Ítems PLS admin: visibles para admin y prevencionista
    if (item.pamAdminOnly && !(isAdmin || isPrevencionista)) {
      return false;
    }

    // Mientras el rol se está cargando o si es prevencionista,
    // ocultamos "Importar Datos" para evitar parpadeos (solo en módulo ambiental)
    if (!isPamModule && (loading || isPrevencionista) && item.path === "/importar") {
      return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#b3382a]/95 via-[#b3382a]/90 to-[#9f2f24]/95 text-white border-r border-[#8e2a20]/40">
      {/* User / Org badge / Collapse toggle */}
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-2">
        {/* Cuando está expandido: logo + texto + botón de colapso aparte */}
        {!isCollapsed ? (
          <>
            <Link
              to="/hub"
              className="flex items-center gap-3"
              onClick={onClose}
            >
              <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center">
                <img
                  src="/images/logo.png"
                  alt="Buses JM"
                  className="h-7 w-7 object-contain"
                  loading="lazy"
                />
              </div>
              <div>
                <h1 className="text-xs font-semibold tracking-tight">
                  {isPamModule ? "Gestión de Seguridad" : "Gestión Medio Ambiental"}
                </h1>
              </div>
            </Link>
            {onToggleCollapse && (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="hidden lg:inline-flex items-center justify-center rounded-lg p-1.5 cursor-w-resize text-white/70 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-0"
                    aria-label="Cerrar barra lateral"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <span>Cerrar barra lateral</span>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        ) : (
          /* Cuando está colapsado: el propio logo actúa como toggle y al hover cambia a icono menú */
          onToggleCollapse ? (
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-e-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-0"
                  aria-label="Abrir barra lateral"
                >
                  <span className="relative inline-flex items-center justify-center h-8 w-8">
                    <img
                      src="/images/logo.png"
                      alt="Buses JM"
                      className="h-7 w-7 object-contain transition-opacity duration-150 group-hover:opacity-0"
                      loading="lazy"
                    />
                    <PanelRightOpen className="absolute w-5 h-5 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <span>Abrir barra lateral</span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
              <img
                src="/images/logo.png"
                alt="Buses JM"
                className="h-7 w-7 object-contain"
                loading="lazy"
              />
            </div>
          )
        )}
      </div>

      {/* Navigation */}
      <TooltipProvider>
        <nav className={cn(
          "flex-1 py-4 space-y-1 overflow-y-auto scrollbar-thin",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {filteredNavItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            const link = (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={cn(
                  "relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  isCollapsed
                    ? "justify-center px-0 py-3 w-12 h-12 mx-auto"
                    : "gap-3 px-3 py-2.5",
                  isActive
                    ? cn(
                        "text-white shadow-sm",
                        isCollapsed ? "bg-white/20" : "bg-white/15"
                      )
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                {isActive && !isCollapsed && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 w-[3px] h-5 bg-white rounded-r-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "transition-colors flex-shrink-0",
                    isCollapsed ? "w-5 h-5" : "w-[18px] h-[18px]",
                    isActive ? "text-white" : "text-white/80"
                  )}
                  aria-hidden="true"
                />
                {!isCollapsed && (
                  <span className="ml-2 truncate">{item.label}</span>
                )}
              </Link>
            );

            if (!isCollapsed) {
              return link;
            }

            return (
              <Tooltip key={item.path} delayDuration={150}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <span>{item.label}</span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </TooltipProvider>

      {/* Module Switcher - Visible en ambos módulos */}
      <div className={cn(
        "border-t border-white/10 mt-auto",
        isCollapsed ? "px-2 py-3" : "px-3 py-3"
      )}>
        <TooltipProvider>
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Link
                to="/hub"
                className={cn(
                  "group flex items-center gap-3 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                  "border border-white/20 hover:border-white/30 hover:bg-white/10",
                  isCollapsed
                    ? "w-12 h-12 justify-center mx-auto"
                    : "px-3 py-2.5 w-full"
                )}
              >
                <Home className={cn(
                  "flex-shrink-0 text-white/90 group-hover:text-white transition-colors",
                  isCollapsed ? "w-5 h-5" : "w-4 h-4"
                )} />
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/90 group-hover:text-white truncate">
                      Volver al inicio
                    </p>
                    <p className="text-[10px] text-white/60 group-hover:text-white/70">
                      Ver todos los módulos
                    </p>
                  </div>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <span>Volver al inicio y ver todos los módulos</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* User section removed from sidebar (now handled in header) */}
    </div>
  );
}

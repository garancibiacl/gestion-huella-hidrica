import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Upload,
  Calendar,
  Leaf,
  Settings,
  LogOut,
  Droplets,
  Zap,
  Users,
  BarChart3,
  HelpCircle,
  Activity,
  PanelLeft,
  PanelRightOpen,
  Flame,
  ClipboardList,
  CheckSquare,
  TrendingUp,
  FileText,
  LayoutDashboard,
  Home,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PamNotificationBell } from "@/modules/pam/components/notifications/PamNotificationBell";

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
  { icon: Activity, label: "Capa predictiva", path: "/admin/riesgos" },
  { icon: Users, label: "Usuarios", path: "/admin/usuarios", adminOnly: true },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics", adminOnly: true },
];

// Navegación para Módulo PLS (Gestión de Seguridad)
// Basado en estructura Codelco/Zyght
const pamNavItems: NavItem[] = [
  { icon: ClipboardList, label: "Mis actividades", path: "/pls/my-activities" },
  { icon: LayoutDashboard, label: "Dashboard PLS", path: "/pls/dashboard", pamAdminOnly: true },
  { icon: Upload, label: "Planificación semanal", path: "/admin/pls/upload", pamAdminOnly: true },
  { icon: CheckSquare, label: "Estado de cumplimiento", path: "/admin/pls/board", pamAdminOnly: true },
  { icon: TrendingUp, label: "Desempeño del PLS", path: "/pls/performance", pamAdminOnly: true },
  { icon: FileText, label: "Reportabilidad", path: "/pls/reports", pamAdminOnly: true },
];

interface AppSidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Floating user menu rendered in a Portal, clamped within the viewport
function UserMenuPortal({
  triggerRef,
  onRequestClose,
  children,
}: {
  triggerRef: React.RefObject<HTMLElement>;
  onRequestClose: () => void;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    openLeft: boolean;
  }>({ top: 0, left: 0, openLeft: false });

  useEffect(() => {
    const compute = () => {
      const btn = triggerRef.current;
      const menu = menuRef.current;
      if (!btn || !menu) return;

      const margin = 12;
      const btnRect = btn.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();

      // Clamp vertical para que el menú entero sea visible
      const desiredCenter = btnRect.top + btnRect.height / 2;
      const halfH = menuRect.height / 2;
      const minCenter = margin + halfH;
      const maxCenter = window.innerHeight - margin - halfH;
      const clampedCenter = Math.max(
        minCenter,
        Math.min(desiredCenter, maxCenter)
      );

      // Fallback horizontal: prefer derecha; si no cabe, abrir a la izquierda
      const rightLeft = btnRect.right + margin;
      const rightFits =
        rightLeft + menuRect.width <= window.innerWidth - margin;
      const leftLeft = Math.max(margin, btnRect.left - margin - menuRect.width);

      setPos({
        top: clampedCenter,
        left: rightFits ? rightLeft : leftLeft,
        openLeft: !rightFits,
      });
    };

    const raf = requestAnimationFrame(compute);
    const onReflow = () => requestAnimationFrame(compute);

    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onRequestClose();
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onRequestClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [triggerRef, onRequestClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] w-80 rounded-xl bg-white text-[#0A0D12] shadow-lg ring-1 ring-black/5 overflow-y-auto"
      style={{
        top: pos.top,
        left: pos.left,
        transform: "translateY(-50%)",
        maxHeight: "min(80vh, 480px)",
      }}
    >
      {/* Caret */}
      <div
        className={[
          "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 ring-1 ring-black/5",
          pos.openLeft ? "right-[-6px]" : "left-[-6px]",
        ].join(" ")}
      />
      {children}
    </div>
  );
}

export function AppSidebar({ onClose, isCollapsed = false, onToggleCollapse }: AppSidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, isPrevencionista, loading } = useRole();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  // Detectar si estamos en módulo PLS o Ambiental
  const isPamModule = location.pathname.startsWith('/pls') || location.pathname.startsWith('/admin/pls');
  const navItems = isPamModule ? pamNavItems : environmentalNavItems;

  // Derive user display name and initials
  const rawName =
    (user?.user_metadata && (user.user_metadata as any).full_name) ||
    user?.email ||
    "Usuario";

  const fullName = rawName
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "BJ";

  const roleLabel = isAdmin ? "Admin" : isPrevencionista ? "Prevencionista" : null;
  const userTooltipLabel = fullName;

  const handleSignOut = async () => {
    await signOut();
  };

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

      {/* User section - Solo visible en módulo Ambiental */}
      {!isPamModule && (
        <div
          className={cn(
            "px-5 py-4 border-t border-white/10 relative mt-auto",
            isCollapsed && "flex justify-center"
          )}
        >
          <TooltipProvider>
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  className={cn(
                    "flex items-center text-left rounded-xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-0 transition-all",
                    isCollapsed
                      ? "w-12 h-12 justify-center px-0 mx-auto"
                      : "w-full h-14 gap-3 px-2"
                  )}
                  ref={userMenuButtonRef}
                >
                <div className={cn(
                  "rounded-full bg-white flex items-center justify-center text-[#b3382a] font-semibold shadow-sm",
                  isCollapsed ? "w-10 h-10 text-sm" : "w-9 h-9 text-xs"
                )}>
                  {initials}
                </div>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-sm leading-none tracking-tight truncate whitespace-nowrap max-w-[160px]">
                        {fullName}
                      </h2>
                      <p className="text-[11px] leading-none text-white/70 truncate whitespace-nowrap">
                        {user?.email}
                      </p>
                    </div>
                    <span className="ml-auto text-white/80">›</span>
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              <span>{userTooltipLabel}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {userMenuOpen &&
          createPortal(
            <UserMenuPortal
              triggerRef={userMenuButtonRef}
              onRequestClose={() => setUserMenuOpen(false)}
            >
              <div className="px-5 py-5 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#b3382a]/10 flex items-center justify-center text-[#b3382a] text-xs font-semibold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate max-w-[160px]">
                      {fullName}
                    </p>
                    <p className="text-[11px] text-[#9AA2AB]">
                      Cuenta JM{roleLabel ? ` · ${roleLabel}` : ""}
                    </p>
                    <p className="text-xs text-[#5B6770] truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
              <div className="py-4">
                <Link
                  to="/configuracion"
                  onClick={onClose}
                  className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-[#f1f3f5]"
                >
                  <Settings className="w-4 h-4 text-[#ba4a3f]" />
                  <span>Configuración de cuenta</span>
                </Link>
                <Link
                  to="/ayuda"
                  onClick={onClose}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-[#f1f3f5]"
                >
                  <HelpCircle className="w-4 h-4 text-[#ba4a3f]" />
                  <span>Centro de ayuda</span>
                </Link>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 text-left text-sm text-[#0A0D12] hover:bg-[#f1f3f5] px-5 py-3 rounded-b-xl border-t border-black/5"
              >
                <LogOut className="w-4 h-4 text-[#ba4a3f]" />
                <span className="text-[#5B6770]">Cerrar sesión</span>
              </button>
            </UserMenuPortal>,
            document.body
          )}
        </div>
      )}
    </div>
  );
}

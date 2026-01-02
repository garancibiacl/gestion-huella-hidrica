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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: typeof Droplets;
  label: string;
  path: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: Droplets, label: "Agua", path: "/dashboard/agua" },
  { icon: Zap, label: "Energía Eléctrica", path: "/dashboard/energia" },
  { icon: Upload, label: "Importar Datos", path: "/importar" },
  { icon: Calendar, label: "Períodos", path: "/periodos" },
  { icon: Leaf, label: "Medidas Sustentables", path: "/medidas" },
  { icon: Users, label: "Usuarios", path: "/admin/usuarios", adminOnly: true },
  {
    icon: BarChart3,
    label: "Analytics",
    path: "/admin/analytics",
    adminOnly: true,
  },
  {
    icon: Activity,
    label: "Capa predictiva",
    path: "/admin/riesgos",
  },
];

interface AppSidebarProps {
  onClose?: () => void;
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
      className="fixed z-[60] w-72 rounded-xl bg-white text-[#0A0D12] shadow-lg ring-1 ring-black/5 overflow-y-auto"
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

export function AppSidebar({ onClose }: AppSidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, isPrevencionista, loading } = useRole();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuButtonRef = useRef<HTMLButtonElement | null>(null);

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

  const handleSignOut = async () => {
    await signOut();
  };

  const filteredNavItems = navItems.filter((item) => {
    // Ítems solo admin
    if (item.adminOnly && !isAdmin) {
      return false;
    }

    // Mientras el rol se está cargando o si es prevencionista,
    // ocultamos "Importar Datos" para evitar parpadeos
    if ((loading || isPrevencionista) && item.path === "/importar") {
      return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#b3382a]/95 via-[#b3382a]/90 to-[#9f2f24]/95 text-white border-r border-[#8e2a20]/40">
      {/* User / Org badge - More compact */}
      <div className="px-5 py-4 border-b border-white/10">
        <Link
          to="/dashboard"
          className="flex items-center gap-3"
          onClick={onClose}
        >
          <img
            src="/images/logo.png"
            alt="Buses JM"
            className="h-9 w-9 rounded-xl bg-white/10 object-contain p-1"
            loading="lazy"
          />
          <div>
            <h1 className="text-xs font-semibold tracking-tight">
              Gestión Medio Ambiental
            </h1>
          </div>
        </Link>
      </div>

      {/* User menu moved to bottom - top block removed */}

      {/* Navigation - Compact spacing */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {filteredNavItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 w-[3px] h-5 bg-white rounded-r-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon
                className={cn(
                  "w-[18px] h-[18px] transition-colors",
                  isActive ? "text-white" : "text-white/80"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10 relative mt-auto">
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          aria-expanded={userMenuOpen}
          className="w-full h-14 flex items-center gap-3 text-left rounded-xl hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-0 px-2"
          ref={userMenuButtonRef}
        >
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#b3382a] text-xs font-semibold shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm leading-none tracking-tight truncate whitespace-nowrap max-w-[160px]">
              {fullName}
            </h2>
            <p className="text-[11px] leading-none text-white/70 truncate whitespace-nowrap">
              {user?.email}
            </p>
          </div>
          <span className="ml-auto text-white/80">›</span>
        </button>

        {userMenuOpen &&
          createPortal(
            <UserMenuPortal
              triggerRef={userMenuButtonRef}
              onRequestClose={() => setUserMenuOpen(false)}
            >
              <div className="px-4 py-3 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#b3382a]/10 flex items-center justify-center text-[#b3382a] text-xs font-semibold">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate max-w-[160px]">
                      {fullName}
                    </p>
                    <p className="text-xs text-[#5B6770] truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>
              <div className="py-2">
                <Link
                  to="/configuracion"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#F7F9FA]"
                >
                  <Settings className="w-4 h-4 text-[#0A0D12]/70" />
                  <span>Configuración de cuenta</span>
                </Link>
                <Link
                  to="/ayuda"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-[#F7F9FA]"
                >
                  <HelpCircle className="w-4 h-4 text-[#0A0D12]/70" />
                  <span>Centro de ayuda</span>
                </Link>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 text-left text-sm text-[#0A0D12] hover:bg-[#F7F9FA] px-4 py-2 rounded-b-xl border-t border-black/5"
              >
                <LogOut className="w-4 h-4 text-[#0A0D12]/70" />
                <span>Cerrar sesión</span>
              </button>
            </UserMenuPortal>,
            document.body
          )}
      </div>
    </div>
  );
}

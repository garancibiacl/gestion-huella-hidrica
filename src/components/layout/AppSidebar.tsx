import { Link, useLocation } from "react-router-dom";
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
  { icon: Settings, label: "Configuración", path: "/configuracion" },
  { icon: Users, label: "Usuarios", path: "/admin/usuarios", adminOnly: true },
  {
    icon: BarChart3,
    label: "Analytics",
    path: "/admin/analytics",
    adminOnly: true,
  },
];

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin, isPrevencionista } = useRole();

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
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    if (isPrevencionista && item.path === "/importar") {
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

      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#b3382a] text-xs font-semibold shadow-sm">
            {initials}
          </div>
          <div>
            <h2 className="font-semibold text-sm tracking-tight truncate max-w-[140px]">
              {fullName}
            </h2>
            <p className="text-[11px] text-white/70">Buses JM</p>
          </div>
        </div>
      </div>

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

      {/* Logout - Subtle */}
      <div className="px-3 py-3 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

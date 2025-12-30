import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Calendar, 
  Leaf, 
  Settings, 
  LogOut,
  Droplets,
  Zap,
  Users,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: typeof Droplets;
  label: string;
  path: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { icon: Droplets, label: 'Agua Humano', path: '/dashboard/agua' },
  { icon: Droplets, label: 'Agua Medidor', path: '/dashboard/agua-medidor' },
  { icon: Zap, label: 'Energía Eléctrica', path: '/dashboard/energia' },
  { icon: Upload, label: 'Importar Datos', path: '/importar' },
  { icon: Calendar, label: 'Períodos', path: '/periodos' },
  { icon: Leaf, label: 'Medidas Sustentables', path: '/medidas' },
  { icon: Settings, label: 'Configuración', path: '/configuracion' },
  { icon: Users, label: 'Usuarios', path: '/admin/usuarios', adminOnly: true },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics', adminOnly: true },
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
    'Usuario';

  const fullName = rawName
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'BJ';

  const handleSignOut = async () => {
    await signOut();
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    if (isPrevencionista && item.path === '/importar') {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border/50">
      {/* User / Org badge - More compact */}
      <div className="px-5 py-5 border-b border-sidebar-border/50">
        <Link to="/dashboard" className="flex items-center gap-3 group" onClick={onClose}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm group-hover:shadow-primary-glow transition-shadow duration-300 text-primary-foreground text-sm font-semibold">
            {initials}
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-sm tracking-tight truncate max-w-[140px]">{fullName}</h1>
            <p className="text-[11px] text-muted-foreground">Buses JM</p>
          </div>
        </Link>
      </div>

      {/* Navigation - Compact spacing */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-sidebar-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute left-0 w-[3px] h-5 bg-primary rounded-r-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon className={cn(
                "w-[18px] h-[18px] transition-colors",
                isActive ? "text-primary" : ""
              )} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout - Subtle */}
      <div className="px-3 py-3 border-t border-sidebar-border/50">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

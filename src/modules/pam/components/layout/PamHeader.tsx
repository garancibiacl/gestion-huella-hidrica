import { useState } from 'react';
import { Search, Bell, Settings, HelpCircle, Menu, X, LogOut, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { usePamNotifications } from '../../hooks/usePamNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';

interface PamHeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

export function PamHeader({ onMenuClick, className }: PamHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { notifications, unreadCount } = usePamNotifications();
  const { user, signOut } = useAuth();
  const { isAdmin, isPrevencionista } = useRole();

  // Derivar nombre y iniciales del usuario
  const rawName = (user?.user_metadata && (user.user_metadata as any).full_name) || user?.email || 'Usuario';
  const fullName = rawName
    .split(' ')
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('') || 'BJ';

  const roleLabel = isAdmin ? 'Admin' : isPrevencionista ? 'Prevencionista' : 'Worker';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Buscar:', searchQuery);
      // TODO: Implementar búsqueda de tareas
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b bg-gradient-to-r from-[#b3382a] to-[#9f2f24] text-white shadow-md',
        className
      )}
    >
      <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-4 lg:h-16 lg:gap-4">
        {/* Left: Menu + Search */}
        <div className="flex items-center gap-2 flex-1 lg:gap-4">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden text-white hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menú</span>
            </Button>
          )}

          {/* Search Bar - Desktop always visible, Mobile toggle */}
          <form
            onSubmit={handleSearch}
            className={cn(
              'relative flex-1 max-w-md transition-all duration-200',
              searchOpen ? 'flex' : 'hidden lg:flex'
            )}
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
            <Input
              type="search"
              placeholder="Buscar tareas, personas, contratos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border-white/20 bg-white/10 pl-9 pr-4 text-sm text-white placeholder:text-white/60 focus-visible:bg-white/15 focus-visible:ring-white/30 lg:h-10"
            />
          </form>

          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(!searchOpen)}
            className="lg:hidden text-white hover:bg-white/10"
          >
            {searchOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            <span className="sr-only">
              {searchOpen ? 'Cerrar búsqueda' : 'Abrir búsqueda'}
            </span>
          </Button>
        </div>

        {/* Right: Quick Actions */}
        <div className="flex items-center gap-1 lg:gap-2">
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white hover:bg-white/10"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-red-600 shadow-md">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                <span className="sr-only">
                  Notificaciones ({unreadCount} sin leer)
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificaciones</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} nuevas
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No hay notificaciones
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      asChild
                      className="cursor-pointer"
                    >
                      <Link
                        to={`/pls/my-activities?task=${notification.task_id}`}
                        className="flex flex-col gap-1 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium line-clamp-1">
                            {notification.title}
                          </span>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
              {notifications.length > 5 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to="/pls/notifications"
                      className="text-center text-sm text-primary"
                    >
                      Ver todas las notificaciones
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-white hover:bg-white/10 h-10 px-2 rounded-lg"
              >
                {/* Desktop: Nombre + Avatar */}
                <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                  {fullName}
                </span>
                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-[#b3382a] text-xs font-semibold shadow-sm flex-shrink-0">
                  {initials}
                </div>
                <ChevronDown className="h-4 w-4 hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{fullName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground mt-1">
                    {roleLabel}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/configuracion" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/ayuda" className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Centro de ayuda</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/hub" className="cursor-pointer">
                  <span className="ml-6 text-sm">Volver al panel de módulos</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

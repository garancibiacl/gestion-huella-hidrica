import { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Menu, PanelLeft, PanelRightOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { AppSidebar } from './AppSidebar';
import { Button } from '@/components/ui/button';
import { usePageTracking } from '@/hooks/usePageTracking';
import { FullPageLoader } from '@/components/ui/full-page-loader';
import { cn } from '@/lib/utils';
import { PamNotificationBell } from '@/modules/pam/components/notifications/PamNotificationBell';
import { PamHeader } from '@/modules/pam/components/layout/PamHeader';

export function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Detectar si estamos en módulo PAM
  const isPamModule = location.pathname.startsWith('/pam') || location.pathname.startsWith('/admin/pam');
  
  // Track page views
  usePageTracking();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block fixed inset-y-0 left-0 z-50 transition-[width] duration-300 ease-out',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <AppSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-64 z-50 lg:hidden"
            >
              <AppSidebar onClose={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Header - Condicional según módulo */}
      {isPamModule ? (
        /* PAM Header - Visible en móvil y desktop */
        <PamHeader 
          onMenuClick={() => setSidebarOpen(true)}
          className={cn(
            'fixed top-0 right-0 z-30',
            sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'
          )}
        />
      ) : (
        /* Header Ambiental - Solo móvil */
        <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:hidden z-30">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="mr-4"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <span className="font-semibold">Buses JM</span>
          </div>
          <PamNotificationBell />
        </header>
      )}

      {/* Main Content */}
      <main
        className={cn(
          'flex-1',
          isPamModule ? 'pt-14 lg:pt-16' : 'pt-16 lg:pt-0',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}

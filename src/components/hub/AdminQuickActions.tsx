import { motion } from 'framer-motion';
import { Users, BarChart3, Settings, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  path: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <Users className="w-5 h-5" />,
    label: 'Usuarios',
    path: '/admin/usuarios',
    color: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    label: 'Analytics',
    path: '/admin/analytics',
    color: 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200',
  },
  {
    icon: <Settings className="w-5 h-5" />,
    label: 'Configuración',
    path: '/configuracion',
    color: 'hover:bg-gray-50 hover:text-gray-600 hover:border-gray-200',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    label: 'Riesgos',
    path: '/admin/riesgos',
    color: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
  },
];

export function AdminQuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="mt-12"
    >
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Accesos rápidos de administración
        </h2>
        <p className="text-sm text-gray-600">
          Gestiona usuarios, configuración y reportes del sistema
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((action, index) => (
          <motion.div
            key={action.path}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              to={action.path}
              className={cn(
                'flex flex-col items-center justify-center gap-3 p-6 rounded-xl',
                'bg-white border border-gray-200 shadow-sm',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b3382a]',
                action.color
              )}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 transition-colors">
                {action.icon}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {action.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

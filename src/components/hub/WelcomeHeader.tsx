import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WelcomeHeaderProps {
  userName: string;
  userRole: string;
  lastConnection?: string;
}

export function WelcomeHeader({ userName, userRole, lastConnection }: WelcomeHeaderProps) {
  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    prevencionista: { label: 'Prevencionista', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    worker: { label: 'Trabajador', color: 'bg-green-100 text-green-700 border-green-200' },
  };

  const roleInfo = roleLabels[userRole] || roleLabels.worker;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-12"
    >
      {/* Welcome Message */}
      <div className="mb-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
          Bienvenido, <span className="text-[#b3382a]">{userName}</span>
        </h1>
        <p className="text-lg text-gray-600">
          Selecciona el módulo con el que deseas trabajar
        </p>
      </div>

      {/* User Info Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="inline-flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl shadow-sm"
      >
        <Badge variant="outline" className={roleInfo.color}>
          {roleInfo.label}
        </Badge>
        {lastConnection && (
          <>
            <div className="h-4 w-px bg-amber-300" />
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Última conexión: {lastConnection}</span>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  path: string;
  gradient: string;
  accentColor: string;
  badge?: string;
  badgeColor?: string;
  delay?: number;
}

export function ModuleCard({
  title,
  description,
  icon,
  features,
  path,
  gradient,
  accentColor,
  badge,
  badgeColor,
  delay = 0,
}: ModuleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Link
        to={path}
        className="block group relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#ae3f34]"
      >
        {/* Top Color Border */}
        <div className={cn('h-1.5 w-full', gradient)} />

        {/* Content */}
        <div className="relative p-8 bg-white">
          {/* Badge */}
          {badge && (
            <div className="absolute top-6 right-6">
              <span className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border',
                badgeColor
              )}>
                {badge}
              </span>
            </div>
          )}

          {/* Icon Container */}
          <div className="mb-6">
            <div
              className={cn(
                'inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg',
                gradient,
                'text-white'
              )}
            >
              {icon}
            </div>
          </div>

          {/* Title & Description */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {description}
            </p>
          </div>

          {/* Features List */}
          <ul className="space-y-3 mb-8">
            {features.map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: delay + 0.1 + index * 0.05 }}
                className="flex items-start gap-3 text-sm text-gray-700"
              >
                <div
                  className={cn(
                    'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
                    gradient
                  )}
                >
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span>{feature}</span>
              </motion.li>
            ))}
          </ul>

          {/* CTA Button */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-sm font-bold text-[#ae3f34] uppercase tracking-wide flex items-center gap-2">
              INGRESAR AL MÓDULO
              <ArrowRight className="w-4 h-4" />
            </span>
            <span className="text-xs text-gray-400 font-medium">
              V2.4.0
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

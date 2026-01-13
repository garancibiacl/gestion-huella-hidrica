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
        className="block group relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b3382a]"
      >
        {/* Gradient Background - Subtle on hover */}
        <div
          className={cn(
            'absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300',
            gradient
          )}
        />

        {/* Content */}
        <div className="relative p-8">
          {/* Icon Container */}
          <div className="mb-6">
            <div
              className={cn(
                'inline-flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300',
                'group-hover:scale-110 group-hover:shadow-lg',
                gradient,
                'text-white'
              )}
            >
              {icon}
            </div>
          </div>

          {/* Title & Description */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-[#b3382a] transition-colors">
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
            <span className="text-sm font-semibold text-gray-900 group-hover:text-[#b3382a] transition-colors">
              Acceder al módulo
            </span>
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
                'group-hover:scale-110',
                gradient,
                'text-white'
              )}
            >
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Hover Effect Border */}
        <div
          className={cn(
            'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
            'ring-2 ring-inset',
            `ring-[${accentColor}]/20`
          )}
        />
      </Link>
    </motion.div>
  );
}

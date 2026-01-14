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
  size?: "default" | "compact";
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
  size = "default",
}: ModuleCardProps) {
  const isCompact = size === "compact";

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
        <div className={cn("relative bg-white", isCompact ? "p-5" : "p-8")}>
          {/* Badge */}
          {badge && (
            <div className={cn("absolute", isCompact ? "top-4 right-4" : "top-6 right-6")}>
              <span className={cn(
                "inline-flex items-center rounded-full text-[10px] font-bold tracking-wider border",
                isCompact ? "px-2.5 py-0.5" : "px-3 py-1",
                badgeColor
              )}>
                {badge}
              </span>
            </div>
          )}

          {/* Icon Container */}
          <div className={cn(isCompact ? "mb-4" : "mb-6")}>
            <div
              className={cn(
                "inline-flex items-center justify-center rounded-2xl shadow-lg",
                isCompact ? "w-12 h-12" : "w-16 h-16",
                gradient,
                'text-white'
              )}
            >
              {icon}
            </div>
          </div>

          {/* Title & Description */}
          <div className={cn(isCompact ? "mb-4" : "mb-6")}>
            <h3 className={cn("font-bold text-gray-900", isCompact ? "text-lg mb-2" : "text-2xl mb-3")}>
              {title}
            </h3>
            <p className={cn("text-gray-600 leading-relaxed", isCompact ? "text-xs" : "text-sm")}>
              {description}
            </p>
          </div>

          {/* Features List */}
          <ul className={cn(isCompact ? "space-y-2 mb-5" : "space-y-3 mb-8")}>
            {features.map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: delay + 0.1 + index * 0.05 }}
                className={cn("flex items-start gap-3 text-gray-700", isCompact ? "text-xs" : "text-sm")}
              >
                <div
                  className={cn(
                    "flex-shrink-0 rounded-full flex items-center justify-center",
                    isCompact ? "w-4 h-4 mt-0.5" : "w-5 h-5 mt-0.5",
                    gradient
                  )}
                >
                  <Check className={cn("text-white", isCompact ? "w-2.5 h-2.5" : "w-3 h-3")} />
                </div>
                <span>{feature}</span>
              </motion.li>
            ))}
          </ul>

          {/* CTA Button */}
          <div className={cn("flex items-center justify-between border-t border-gray-100", isCompact ? "pt-3" : "pt-4")}>
            <span className={cn("font-bold text-[#ae3f34] uppercase tracking-wide flex items-center gap-2", isCompact ? "text-xs" : "text-sm")}>
              INGRESAR AL MÓDULO
              <ArrowRight className={cn(isCompact ? "w-3 h-3" : "w-4 h-4")} />
            </span>
            <span className={cn("text-gray-400 font-medium", isCompact ? "text-[10px]" : "text-xs")}>
              V2.4.0
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

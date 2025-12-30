import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'error';
  };
  className?: string;
  delay?: number;
  variant?: 'default' | 'primary' | 'minimal';
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  badge,
  className,
  delay = 0,
  variant = 'default'
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2 }}
      className={cn(
        "stat-card relative overflow-hidden group",
        variant === 'primary' && "stat-card-primary",
        variant === 'minimal' && "border-transparent shadow-none hover:shadow-card",
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Title - smaller, muted */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          
          {/* Value - Large, prominent */}
          <p className="text-2xl sm:text-3xl font-semibold mt-2 tracking-tight text-foreground">{value}</p>
          
          {/* Trend indicator - Enhanced with gradient chip */}
          {trend && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: delay + 0.2 }}
              className={cn(
                "inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full text-sm font-medium",
                "backdrop-blur-sm border shadow-sm",
                "transition-all duration-300 hover:scale-105 cursor-default",
                trend.positive 
                  ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                  : "bg-gradient-to-r from-rose-500/15 to-orange-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              )}
            >
              <motion.span
                animate={{ 
                  y: trend.positive ? [0, -2, 0] : [0, 2, 0],
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full",
                  trend.positive 
                    ? "bg-emerald-500/20" 
                    : "bg-rose-500/20"
                )}
              >
                {trend.positive ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" />
                )}
              </motion.span>
              <span className="font-semibold">{trend.value}</span>
              {subtitle && (
                <span className="text-muted-foreground font-normal text-xs opacity-80">{subtitle}</span>
              )}
            </motion.div>
          )}

          {/* Badge - Enhanced with gradient and glow */}
          {badge && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: delay + 0.25 }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mt-3",
                "backdrop-blur-sm border shadow-sm",
                "transition-all duration-300 hover:scale-105 cursor-default",
                badge.variant === 'success' && "bg-gradient-to-r from-emerald-500/15 to-green-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-emerald-500/10",
                badge.variant === 'warning' && "bg-gradient-to-r from-amber-500/15 to-yellow-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-amber-500/10",
                badge.variant === 'error' && "bg-gradient-to-r from-rose-500/15 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 shadow-rose-500/10"
              )}
            >
              <Sparkles className="w-3 h-3" />
              {badge.text}
            </motion.div>
          )}
        </div>
        
        {/* Icon - Refined with gradient background */}
        {icon && (
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
              variant === 'primary' 
                ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25" 
                : "bg-gradient-to-br from-primary/12 to-primary/5 text-primary group-hover:from-primary/18 group-hover:to-primary/8"
            )}
          >
            {icon}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

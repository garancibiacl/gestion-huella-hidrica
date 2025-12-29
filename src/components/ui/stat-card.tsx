import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
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
          
          {/* Trend indicator */}
          {trend && (
            <div className={cn(
              "flex items-center gap-1.5 mt-3 text-sm font-medium",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              {trend.positive ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              <span>{trend.value}</span>
              {subtitle && (
                <span className="text-muted-foreground font-normal text-xs ml-1">{subtitle}</span>
              )}
            </div>
          )}

          {/* Badge */}
          {badge && (
            <div className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-3",
              badge.variant === 'success' && "bg-success/10 text-success border border-success/20",
              badge.variant === 'warning' && "bg-warning/10 text-warning border border-warning/20",
              badge.variant === 'error' && "bg-destructive/10 text-destructive border border-destructive/20"
            )}>
              {badge.text}
            </div>
          )}
        </div>
        
        {/* Icon - Refined */}
        {icon && (
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300",
            variant === 'primary' 
              ? "bg-primary text-primary-foreground shadow-sm" 
              : "bg-primary/8 text-primary group-hover:bg-primary/12"
          )}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

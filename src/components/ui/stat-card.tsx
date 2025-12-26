import { ReactNode } from 'react';
import { motion } from 'framer-motion';
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
}

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  badge,
  className,
  delay = 0 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "stat-card relative overflow-hidden",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
          
          {trend && (
            <p className={cn(
              "text-sm mt-2 flex items-center gap-1",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.positive ? '↓' : '↑'}</span>
              <span>{trend.value}</span>
              {subtitle && <span className="text-muted-foreground ml-1">{subtitle}</span>}
            </p>
          )}

          {badge && (
            <div className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-2",
              badge.variant === 'success' && "bg-success/10 text-success",
              badge.variant === 'warning' && "bg-warning/10 text-warning",
              badge.variant === 'error' && "bg-destructive/10 text-destructive"
            )}>
              {badge.text}
            </div>
          )}
        </div>
        
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

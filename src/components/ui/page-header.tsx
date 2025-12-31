import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  showLogo?: boolean;
}

export function PageHeader({ title, description, action, showLogo = true }: PageHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
    >
      <div className="flex items-center gap-3">
        {showLogo && (
          <img
            src="/images/logo.png"
            alt="Buses JM"
            className="h-10 w-10 rounded-lg bg-background object-contain shadow-sm"
            loading="lazy"
          />
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </motion.div>
  );
}

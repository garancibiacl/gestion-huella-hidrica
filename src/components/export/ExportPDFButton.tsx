import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileDown, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExportPDFButtonProps {
  onExport: () => void | Promise<void>;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ExportPDFButton({ 
  onExport, 
  label = 'Exportar PDF',
  variant = 'default',
  size = 'sm',
  className
}: ExportPDFButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      await onExport();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant={variant}
      size={size}
      className={cn(
        'gap-2 relative overflow-hidden transition-all duration-300 bg-[#ba4a3f] text-white hover:bg-[#a13f36] disabled:opacity-70',
        isSuccess && 'bg-[#14532d] border-0 text-white hover:bg-[#166534]',
        className
      )}
    >
      <AnimatePresence mode="wait">
        {isExporting ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Generando...</span>
          </motion.span>
        ) : isSuccess ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <Check className="w-4 h-4" />
            </motion.div>
            <span className="hidden sm:inline">Descargado</span>
          </motion.span>
        ) : (
          <motion.span
            key="default"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

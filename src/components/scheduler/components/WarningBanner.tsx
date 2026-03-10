import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type WarningBannerProps = {
  catedraLabel: string;
  onDismiss: () => void;
  className?: string;
};

export const WarningBanner = ({ catedraLabel, onDismiss, className }: WarningBannerProps) => (
  <div
    className={cn(
      'absolute left-1/2 top-1 z-20 -translate-x-1/2 rounded-md border border-amber-300/70 bg-amber-100/70 px-3 py-1.5 text-[13px] font-medium text-amber-900 shadow-sm backdrop-blur-sm dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-100',
      className
    )}
  >
    <button
      type="button"
      onClick={onDismiss}
      className="pointer-events-auto absolute right-1 top-1 text-amber-900/70 hover:text-amber-900 dark:text-amber-100/80 dark:hover:text-amber-100"
      aria-label="Cerrar aviso"
      title="Cerrar aviso"
    >
      <X size={12} />
    </button>
    <div className="pr-5 leading-tight">
      <div className="inline-flex items-center gap-1.5">
        <AlertTriangle size={14} />
        <span className="font-bold">CUIDADO!</span>
      </div>
      <div className="mt-0.5">
        ya tenés seleccionada una{' '}
        <span className="font-semibold">Comisión de la {catedraLabel}</span> de esta materia.
      </div>
      <div>Si seleccionás otra, se te va a reemplazar automáticamente.</div>
    </div>
  </div>
);

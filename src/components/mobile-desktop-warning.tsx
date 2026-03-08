'use client';

import { MonitorSmartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/use-local-storage';

const MOBILE_WARNING_DISMISSED_KEY = 'uba_psi_mobile_warning_dismissed_v1';

type MobileDesktopWarningProps = {
  className?: string;
};

export const MobileDesktopWarning = ({ className }: MobileDesktopWarningProps) => {
  const storage = useLocalStorage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const updateVisibility = () => {
      const dismissed = storage.getItem(MOBILE_WARNING_DISMISSED_KEY) === '1';
      setIsVisible(mediaQuery.matches && !dismissed);
    };

    updateVisibility();
    mediaQuery.addEventListener('change', updateVisibility);

    return () => {
      mediaQuery.removeEventListener('change', updateVisibility);
    };
  }, [storage]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-300/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 shadow-sm dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-100',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <MonitorSmartphone size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="flex-1 leading-relaxed">
          Tip: esta herramienta funciona, pero la experiencia completa del calendario es mejor en
          desktop/notebook.
        </p>
        <button
          type="button"
          onClick={() => {
            storage.setItem(MOBILE_WARNING_DISMISSED_KEY, '1');
            setIsVisible(false);
          }}
          className="rounded-md p-1 text-amber-900/80 transition hover:bg-amber-100 dark:text-amber-100/80 dark:hover:bg-amber-900/50"
          aria-label="Cerrar aviso de experiencia en desktop"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

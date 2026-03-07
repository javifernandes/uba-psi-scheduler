'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 px-3 backdrop-blur-[2px] dark:bg-black/30"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'w-full max-w-md rounded-xl border border-[#d7b8c9] bg-[#fff8fc] px-4 py-5 shadow-xl',
          'dark:border-zinc-700 dark:bg-zinc-900'
        )}
        onClick={event => event.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[#5a1740] dark:text-zinc-100">{title}</h3>
        <p className="mt-2 text-sm text-[#6f5866] dark:text-zinc-300">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-[#d7b8c9] bg-white px-3 py-1.5 text-sm font-medium text-[#5a1740] hover:bg-[#fdf1f7] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-[#861f5c] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6f184c]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

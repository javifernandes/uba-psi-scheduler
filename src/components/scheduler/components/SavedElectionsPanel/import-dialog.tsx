import type { RefObject } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedElectionsImportPreview } from '@/domain/saved-elections';
import { displaySubjectLabel } from '../../scheduler.utils';

type SavedElectionsImportDialogProps = {
  isOpen: boolean;
  isImportLoading: boolean;
  isImportApplying: boolean;
  importError: string | null;
  importPreview: SavedElectionsImportPreview | null;
  importModalInputRef: RefObject<HTMLInputElement | null>;
  importReasonLabel: (reason: 'catedra_no_encontrada' | 'comision_no_encontrada') => string;
  onClose: () => void;
  onHandleImportFile: (file: File) => Promise<void>;
  onConfirmImport: () => Promise<void>;
};

export const SavedElectionsImportDialog = ({
  isOpen,
  isImportLoading,
  isImportApplying,
  importError,
  importPreview,
  importModalInputRef,
  importReasonLabel,
  onClose,
  onHandleImportFile,
  onConfirmImport,
}: SavedElectionsImportDialogProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 px-3 backdrop-blur-[2px] dark:bg-black/30"
      role="presentation"
      onClick={() => {
        if (isImportLoading || isImportApplying) return;
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Importar elecciones"
        className="w-full max-w-2xl rounded-xl border border-[#d7b8c9] bg-[#fff8fc] px-4 py-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#5a1740] dark:text-zinc-100">
            Importar elecciones
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[#d7b8c9] bg-white px-2 py-1 text-xs font-medium text-[#5a1740] hover:bg-[#fdf1f7] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            disabled={isImportLoading || isImportApplying}
          >
            Cerrar
          </button>
        </div>
        <input
          ref={importModalInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = event.target.files?.[0];
            if (!file) return;
            await onHandleImportFile(file);
            input.value = '';
          }}
        />
        <div
          className={cn(
            'mt-3 rounded-xl border border-dashed border-[#d7b8c9] bg-white/60 p-4 text-sm dark:border-zinc-600 dark:bg-zinc-800/70',
            isImportLoading && 'opacity-70'
          )}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={async (event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (!file) return;
            await onHandleImportFile(file);
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[#6f5866] dark:text-zinc-300">
              Arrastrá un `.json` acá o seleccioná un archivo.
            </span>
            <button
              type="button"
              onClick={() => importModalInputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#861f5c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6f184c]"
              disabled={isImportLoading || isImportApplying}
            >
              <Upload size={13} />
              Subir archivo
            </button>
          </div>
        </div>
        {isImportLoading ? (
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-[#6f5866] dark:text-zinc-300">
            <Loader2 size={14} className="animate-spin" />
            Procesando archivo...
          </div>
        ) : null}
        {importError ? (
          <div className="mt-3 rounded-md border border-rose-300/70 bg-rose-100/70 px-3 py-2 text-xs text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-100">
            {importError}
          </div>
        ) : null}
        {importPreview ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-md border border-[#e9d5e2] bg-white/70 px-3 py-2 text-xs text-[#6f5866] dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
              Entradas: <strong>{importPreview.totalEntries}</strong> · Aplicables:{' '}
              <strong>{importPreview.mapped.length}</strong> · Omitidas:{' '}
              <strong>{importPreview.rejected.length}</strong>
              {importPreview.period ? ` · Período: ${importPreview.period}` : ''}
            </div>
            <div className="max-h-56 overflow-auto rounded-md border border-[#e9d5e2] bg-white/70 p-2 dark:border-zinc-700 dark:bg-zinc-800/70">
              {importPreview.mapped.length ? (
                <div className="divide-y divide-[#e8d3df] dark:divide-zinc-700">
                  {importPreview.mapped.map((item) => (
                    <div key={`${item.subjectId}-${item.comision}`} className="py-1.5 text-xs">
                      <div className="font-semibold text-[#4f1237] dark:text-zinc-100">
                        {displaySubjectLabel(item.subjectLabel)}
                      </div>
                      <div className="text-[#6f5866] dark:text-zinc-300">
                        Cátedra {item.catedra} · Comisión {item.comision}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#7c6272] dark:text-zinc-400">
                  No hay elecciones aplicables en este archivo.
                </div>
              )}
            </div>
            {importPreview.rejected.length ? (
              <div className="max-h-36 overflow-auto rounded-md border border-amber-300/70 bg-amber-100/60 p-2 text-xs text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-100">
                <div className="mb-1 font-semibold">Entradas omitidas</div>
                <div className="space-y-1">
                  {importPreview.rejected.map((item, index) => (
                    <div key={`rejected-${index}`}>
                      Cátedra {item.catedra} · Comisión {item.comision || '(vacía)'}:{' '}
                      {importReasonLabel(item.reason)}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#d7b8c9] bg-white px-3 py-1.5 text-sm font-medium text-[#5a1740] hover:bg-[#fdf1f7] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            disabled={isImportLoading || isImportApplying}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmImport}
            className="inline-flex items-center gap-1 rounded-lg bg-[#861f5c] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6f184c] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              isImportLoading ||
              isImportApplying ||
              !importPreview ||
              importPreview.mapped.length === 0
            }
          >
            {isImportApplying ? <Loader2 size={14} className="animate-spin" /> : null}
            Confirmar importación
          </button>
        </div>
      </div>
    </div>
  );
};

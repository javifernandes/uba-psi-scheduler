import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  ListTree,
  Trash2,
  Upload,
} from 'lucide-react';

type SavedElectionsToolbarProps = {
  isOpen: boolean;
  hasSavedElections: boolean;
  savedSubjectsCount: number;
  isDayView: boolean;
  onExportSelections: () => void;
  onOpenImportDialog: () => void;
  onToggleViewMode: () => void;
  onRemoveAll: () => void;
  onToggleOpen: () => void;
};

const actionButtonClass =
  'inline-flex h-6 w-6 items-center justify-center rounded text-[#8a6a7d] hover:bg-[#f4e8ef] hover:text-[#5a1740] disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

export const SavedElectionsToolbar = ({
  isOpen,
  hasSavedElections,
  savedSubjectsCount,
  isDayView,
  onExportSelections,
  onOpenImportDialog,
  onToggleViewMode,
  onRemoveAll,
  onToggleOpen,
}: SavedElectionsToolbarProps) => (
  <div className="mb-2 flex cursor-pointer items-center justify-between" onClick={onToggleOpen}>
    <h2 className="text-sm font-semibold text-[#5a1740] dark:text-zinc-100">Mis elecciones</h2>
    <div className="flex items-center gap-1">
      {isOpen ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onExportSelections();
            }}
            disabled={!hasSavedElections}
            className={actionButtonClass}
            aria-label="Exportar elecciones"
            title="Exportar elecciones"
            data-tour="saved-elections-export"
            data-testid="saved-elections-export"
          >
            <Download size={13} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpenImportDialog();
            }}
            className={actionButtonClass}
            aria-label="Importar elecciones"
            title="Importar elecciones"
            data-tour="saved-elections-import"
            data-testid="saved-elections-import"
          >
            <Upload size={13} />
          </button>
          {hasSavedElections ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleViewMode();
              }}
              className={actionButtonClass}
              aria-label={isDayView ? 'Ver elecciones por materia' : 'Ver elecciones por día'}
              title={isDayView ? 'Ver elecciones por materia' : 'Ver elecciones por día'}
              data-testid="saved-elections-view-toggle"
            >
              {isDayView ? <ListTree size={13} /> : <CalendarDays size={13} />}
            </button>
          ) : null}
        </>
      ) : null}
      {isOpen && hasSavedElections ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemoveAll();
          }}
          className={actionButtonClass}
          aria-label="Quitar todas las elecciones"
          title="Quitar todas las elecciones"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
      {!isOpen ? (
        <span className="text-[11px] text-[#9f8695] dark:text-zinc-400">{savedSubjectsCount}</span>
      ) : null}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleOpen();
        }}
        className="text-[#9f8695] hover:text-[#6d5162] dark:text-zinc-400 dark:hover:text-zinc-200"
        aria-label="Expandir o colapsar Mis elecciones"
      >
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
    </div>
  </div>
);

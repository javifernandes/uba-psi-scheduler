import Link from 'next/link';
import { CircleHelp } from 'lucide-react';

type SchedulerHeaderProps = {
  title: string;
  onStartTour: () => void;
};

export const SchedulerHeader = ({ title, onStartTour }: SchedulerHeaderProps) => (
  <div className="rounded-2xl bg-[#861f5c] px-4 py-2 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <h1 className="flex items-center gap-3 text-lg tracking-tight text-white md:text-xl">
        <Link
          href="/"
          className="rounded-md border border-white/25 bg-white/10 px-2 py-0.5 text-xs font-semibold text-white hover:bg-white/15"
        >
          ← Volver
        </Link>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white/10 text-base font-black">
          Ψ
        </span>
        <span className="font-bold">{title}</span>
      </h1>
      <button
        type="button"
        onClick={onStartTour}
        className="inline-flex items-center gap-1 rounded-md border border-white/25 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/15"
        aria-label="Mostrar tour guiado"
        data-tour="tour-help-button"
      >
        <CircleHelp size={13} />
        Tour
      </button>
    </div>
  </div>
);

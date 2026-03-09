export const CalendarLegend = () => (
  <div className="sticky bottom-2 z-10 ml-auto mr-2 mt-2 w-fit rounded-md border border-white/45 bg-white/55 px-2 py-1 text-[11px] text-[#66495a] shadow-sm backdrop-blur-sm dark:border-zinc-500/50 dark:bg-zinc-900/45 dark:text-zinc-300">
    <span className="mr-3">
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#861f5c]" /> Práctico
    </span>
    <span className="mr-3">
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#0f766e]" /> Teórico
    </span>
    <span>
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#d97706]" /> Seminario
    </span>
  </div>
);

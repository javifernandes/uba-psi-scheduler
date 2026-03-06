import type { MouseEventHandler } from 'react';

type StackSwitcherProps = {
  stackSize: number;
  onPrevClick: MouseEventHandler<HTMLButtonElement>;
  onNextClick: MouseEventHandler<HTMLButtonElement>;
};

export const StackSwitcher = ({ stackSize, onPrevClick, onNextClick }: StackSwitcherProps) => {
  if (stackSize <= 1) return null;

  return (
    <span className="absolute right-1 top-0.5 z-10 inline-flex items-center rounded bg-black/28 px-1 text-[9px] font-semibold text-white/90">
      <button
        type="button"
        onClick={onPrevClick}
        className="w-0 overflow-hidden leading-none text-white/90 opacity-0 transition-all duration-150 group-hover:mr-0.5 group-hover:w-2.5 group-hover:opacity-100"
        aria-label="Ver anterior en este horario"
      >
        ◀
      </button>
      <span className="inline-block min-w-[10px] text-center">{stackSize}</span>
      <button
        type="button"
        onClick={onNextClick}
        className="w-0 overflow-hidden leading-none text-white/90 opacity-0 transition-all duration-150 group-hover:ml-0.5 group-hover:w-2.5 group-hover:opacity-100"
        aria-label="Ver siguiente en este horario"
      >
        ▶
      </button>
    </span>
  );
};

import type { MouseEventHandler } from 'react';
import { cn } from '@/lib/utils';

type StackSwitcherProps = {
  stackSize: number;
  onPrevClick: MouseEventHandler<HTMLButtonElement>;
  onNextClick: MouseEventHandler<HTMLButtonElement>;
  hoverEffectsLocked?: boolean;
  isExternal?: boolean;
};

export const StackSwitcher = ({
  stackSize,
  onPrevClick,
  onNextClick,
  hoverEffectsLocked = false,
  isExternal = false,
}: StackSwitcherProps) => {
  if (stackSize <= 1) return null;

  return (
    <span
      className={cn(
        'absolute right-1 top-0.5 z-10 inline-flex items-center rounded px-1 text-[9px] font-semibold',
        isExternal ? 'bg-[#f6e8ef]/90 text-[#5a1740]' : 'bg-black/28 text-white/90'
      )}
    >
      <button
        type="button"
        onClick={onPrevClick}
        className={cn(
          'w-0 overflow-hidden leading-none opacity-0 transition-all duration-150',
          isExternal ? 'text-[#5a1740]/85' : 'text-white/90',
          !hoverEffectsLocked && 'group-hover:mr-0.5 group-hover:w-2.5 group-hover:opacity-100'
        )}
        aria-label="Ver anterior en este horario"
      >
        ◀
      </button>
      <span className="inline-block min-w-[10px] text-center">{stackSize}</span>
      <button
        type="button"
        onClick={onNextClick}
        className={cn(
          'w-0 overflow-hidden leading-none opacity-0 transition-all duration-150',
          isExternal ? 'text-[#5a1740]/85' : 'text-white/90',
          !hoverEffectsLocked && 'group-hover:ml-0.5 group-hover:w-2.5 group-hover:opacity-100'
        )}
        aria-label="Ver siguiente en este horario"
      >
        ▶
      </button>
    </span>
  );
};

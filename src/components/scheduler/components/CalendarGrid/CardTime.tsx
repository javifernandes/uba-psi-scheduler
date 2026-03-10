import { cn } from '@/lib/utils';
import type { CalendarEvent } from '../../scheduler.types';
import { timeTextClass } from './styles';

type CardTimeProps = {
  value: string;
  type: CalendarEvent['tipo'];
  position: 'top' | 'bottom';
  hidden: boolean;
};

export const CardTime = ({ value, type, position, hidden }: CardTimeProps) => (
  <span
    className={cn(
      'absolute text-[10px] font-semibold tabular-nums transition-opacity duration-200 ease-in-out',
      position === 'top' ? 'left-2 top-0.5' : 'bottom-0.5 left-2',
      timeTextClass(type),
      hidden && 'opacity-0'
    )}
  >
    {value}
  </span>
);

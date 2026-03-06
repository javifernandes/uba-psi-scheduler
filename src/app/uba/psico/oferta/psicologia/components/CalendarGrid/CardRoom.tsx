import { cn } from '@/lib/utils';
import type { CalendarEvent } from '../../psicologia-scheduler.types';
import { roomTextClass, venuePrefixClass } from './styles';

type CardRoomProps = {
  prefix: string;
  room: string;
  type: CalendarEvent['tipo'];
  hidden: boolean;
};

export const CardRoom = ({ prefix, room, type, hidden }: CardRoomProps) => (
  <span
    className={cn(
      'absolute bottom-0.5 right-2 flex items-end gap-1 transition-opacity duration-200 ease-in-out',
      hidden && 'opacity-0'
    )}
  >
    <span
      className={cn(
        'text-[10px] font-black tracking-wide',
        venuePrefixClass(type),
        hidden && 'opacity-0'
      )}
    >
      {prefix}
    </span>
    <span
      className={cn(
        'text-[10px] font-semibold tabular-nums',
        roomTextClass(type),
        hidden && 'opacity-0'
      )}
    >
      {room}
    </span>
  </span>
);

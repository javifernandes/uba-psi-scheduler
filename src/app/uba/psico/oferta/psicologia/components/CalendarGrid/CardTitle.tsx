import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '../../psicologia-scheduler.types';
import { venuePrefixClass } from './styles';

type CardTitleProps = {
  code: string;
  label: string;
  type: CalendarEvent['tipo'];
  canWrap: boolean;
  wrapStyle?: CSSProperties;
  hidden: boolean;
};

export const CardTitle = ({ code, label, type, canWrap, wrapStyle, hidden }: CardTitleProps) => (
  <span
    className={cn(
      'absolute left-2 right-2 top-1/2 -translate-y-1/2 overflow-hidden text-[11.8px] font-semibold leading-tight',
      canWrap ? 'whitespace-normal' : 'truncate whitespace-nowrap',
      hidden && 'opacity-0'
    )}
    style={canWrap ? wrapStyle : undefined}
  >
    <span className={cn('font-black', venuePrefixClass(type))}>{code}</span>
    <span> - {label}</span>
  </span>
);

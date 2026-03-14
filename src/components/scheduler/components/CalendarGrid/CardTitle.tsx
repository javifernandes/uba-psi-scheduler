import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '../../scheduler.types';
import { venuePrefixClass } from './styles';

type CardTitleProps = {
  code: string;
  label: string;
  type: CalendarEvent['tipo'];
  canWrap: boolean;
  wrapStyle?: CSSProperties;
  subtitle?: string;
  subtitleTone?: 'neutral' | 'critical' | 'warning' | 'good';
  hidden: boolean;
};

const subtitleToneClass = {
  neutral: 'text-white/85',
  critical: 'text-rose-100',
  warning: 'text-amber-100',
  good: 'text-emerald-100',
} as const;

export const CardTitle = ({
  code,
  label,
  type,
  canWrap,
  wrapStyle,
  subtitle,
  subtitleTone = 'neutral',
  hidden,
}: CardTitleProps) => (
  <span
    className={cn(
      'absolute left-2 right-2 top-1/2 -translate-y-1/2 overflow-hidden',
      subtitle ? 'flex flex-col gap-0.5' : 'text-[11.8px] font-semibold leading-tight',
      !subtitle && canWrap && 'whitespace-normal',
      !subtitle && !canWrap && 'truncate whitespace-nowrap',
      hidden && 'opacity-0'
    )}
    style={!subtitle && canWrap ? wrapStyle : undefined}
  >
    {subtitle ? (
      <>
        <span className="truncate whitespace-nowrap text-[11.4px] font-semibold leading-tight">
          <span className={cn('font-black', venuePrefixClass(type))}>{code}</span>
          <span> - {label}</span>
        </span>
        <span
          className={cn(
            'truncate whitespace-nowrap text-[9.8px] font-semibold leading-tight',
            subtitleToneClass[subtitleTone]
          )}
        >
          {subtitle}
        </span>
      </>
    ) : (
      <>
        <span className={cn('font-black', venuePrefixClass(type))}>{code}</span>
        <span> - {label}</span>
      </>
    )}
  </span>
);

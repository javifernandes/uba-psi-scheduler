import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import type { VacancyIndicator } from '@/domain/vacancies';
import { UserRound } from 'lucide-react';
import type { CalendarEvent } from '../../scheduler.types';
import { venuePrefixClass } from './styles';

type CardTitleProps = {
  code: string;
  label: string;
  type: CalendarEvent['tipo'];
  canWrap: boolean;
  wrapStyle?: CSSProperties;
  vacancyIndicator?: VacancyIndicator;
  hidden: boolean;
};

const indicatorToneClass = {
  sin_datos: {
    text: 'text-white/85',
    barOn: 'bg-white/70',
    barOff: 'border border-white/45 bg-white/10',
  },
  sin_cupo: {
    text: 'text-rose-200',
    barOn: 'bg-rose-200',
    barOff: 'border border-rose-200/60 bg-rose-200/10',
  },
  cupo_bajo: {
    text: 'text-amber-200',
    barOn: 'bg-amber-200',
    barOff: 'border border-amber-200/60 bg-amber-200/10',
  },
  cupo_disponible: {
    text: 'text-emerald-200',
    barOn: 'bg-emerald-200',
    barOff: 'border border-emerald-200/55 bg-emerald-200/10',
  },
} as const;

export const CardTitle = ({
  code,
  label,
  type,
  canWrap,
  wrapStyle,
  vacancyIndicator,
  hidden,
}: CardTitleProps) => (
  <span
    className={cn(
      'absolute left-2 right-2 top-1/2 -translate-y-1/2 overflow-hidden',
      vacancyIndicator ? 'flex flex-col gap-0.5' : 'text-[11.8px] font-semibold leading-tight',
      !vacancyIndicator && canWrap && 'whitespace-normal',
      !vacancyIndicator && !canWrap && 'truncate whitespace-nowrap',
      hidden && 'opacity-0'
    )}
    style={!vacancyIndicator && canWrap ? wrapStyle : undefined}
  >
    {vacancyIndicator ? (
      <>
        <span className="truncate whitespace-nowrap text-[11.4px] font-semibold leading-tight">
          <span className={cn('font-black', venuePrefixClass(type))}>{code}</span>
          <span> - {label}</span>
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 truncate whitespace-nowrap text-[9.8px] font-semibold leading-tight',
            indicatorToneClass[vacancyIndicator.status].text
          )}
        >
          <span className="tabular-nums">{vacancyIndicator.countLabel}</span>
          <span className="inline-flex items-center">
            <UserRound
              size={8}
              strokeWidth={2.5}
              aria-hidden="true"
              data-testid="vacancy-indicator-icon"
            />
          </span>
          <span className="inline-flex items-center gap-0.5">
            {[0, 1, 2].map((index) => (
              <span
                key={`vacancy-bar-${index}`}
                className={cn(
                  'h-1.5 w-4 rounded-sm',
                  index < vacancyIndicator.filledBars
                    ? indicatorToneClass[vacancyIndicator.status].barOn
                    : indicatorToneClass[vacancyIndicator.status].barOff
                )}
              />
            ))}
          </span>
          {vacancyIndicator.hintLabel ? <span>{vacancyIndicator.hintLabel}</span> : null}
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

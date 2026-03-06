import type { CalendarEvent } from '../../psicologia-scheduler.types';

export const venuePrefixClass = (type: CalendarEvent['tipo']) => {
  if (type === 'prac') return 'text-[#e8b4d7]';
  if (type === 'teo') return 'text-[#163d39]';
  return 'text-[#8d5722]';
};

export const timeTextClass = (type: CalendarEvent['tipo']) => {
  if (type === 'prac') return 'text-[#f4ddea]';
  if (type === 'teo') return 'text-[#d7f5ef]';
  return 'text-[#fff2df]';
};

export const roomTextClass = (type: CalendarEvent['tipo']) => {
  if (type === 'sem') return 'text-[#111827]';
  return 'text-white/95';
};

export const eventTypeClass = (type: CalendarEvent['tipo']) => {
  if (type === 'prac') return 'bg-[#861f5c]/90';
  if (type === 'teo') return 'bg-[#0f766e]/90';
  return 'bg-[#d97706]/90';
};

import { describe, expect, it } from 'vitest';
import {
  eventTypeClass,
  externalEventAccentClass,
  externalEventCardClass,
  roomTextClass,
  timeTextClass,
  venuePrefixClass,
} from './styles';

describe('CalendarGrid/styles', () => {
  it('eventTypeClass mapea el tipo al fondo esperado', () => {
    expect(eventTypeClass('prac')).toBe('bg-[#861f5c]/90');
    expect(eventTypeClass('teo')).toBe('bg-[#0f766e]/90');
    expect(eventTypeClass('sem')).toBe('bg-[#d97706]/90');
  });

  it('timeTextClass mapea el tipo al color de hora esperado', () => {
    expect(timeTextClass('prac')).toBe('text-[#f4ddea]');
    expect(timeTextClass('teo')).toBe('text-[#d7f5ef]');
    expect(timeTextClass('sem')).toBe('text-[#fff2df]');
  });

  it('roomTextClass mapea el tipo al color de aula esperado', () => {
    expect(roomTextClass('prac')).toBe('text-white/95');
    expect(roomTextClass('teo')).toBe('text-white/95');
    expect(roomTextClass('sem')).toBe('text-[#111827]');
  });

  it('venuePrefixClass mapea el tipo al color de prefijo de sede esperado', () => {
    expect(venuePrefixClass('prac')).toBe('text-[#e8b4d7]');
    expect(venuePrefixClass('teo')).toBe('text-[#163d39]');
    expect(venuePrefixClass('sem')).toBe('text-[#8d5722]');
  });

  it('estilos de eventos externos mantienen fondo unificado y acento por tipo', () => {
    expect(externalEventCardClass).toContain('bg-[#f6eef3]');
    expect(externalEventAccentClass('prac')).toBe('bg-[#861f5c]');
    expect(externalEventAccentClass('teo')).toBe('bg-[#0f766e]');
    expect(externalEventAccentClass('sem')).toBe('bg-[#d97706]');
  });
});

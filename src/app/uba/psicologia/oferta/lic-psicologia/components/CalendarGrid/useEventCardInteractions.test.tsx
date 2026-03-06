import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventCardInteractions } from './useEventCardInteractions';
import type { VisibleEventSlot } from './types';

const makeSlot = (overrides: Partial<VisibleEventSlot> = {}): VisibleEventSlot => ({
  slotKey: 'jueves|14:30|16:00',
  stackSize: 2,
  stackIndex: 0,
  event: {
    tipo: 'prac',
    id: 'prac-21',
    dia: 'jueves',
    inicio: '14:30',
    fin: '16:00',
    aula: 'IN-444',
    title: '21 - Cazes',
    linkedCommissionId: '21',
    sourceSubjectId: '34',
    sourceSubjectLabel: 'Materia',
  },
  slotEvents: [
    {
      tipo: 'prac',
      id: 'prac-21',
      dia: 'jueves',
      inicio: '14:30',
      fin: '16:00',
      aula: 'IN-444',
      title: '21 - Cazes',
      linkedCommissionId: '21',
      sourceSubjectId: '34',
      sourceSubjectLabel: 'Materia',
    },
    {
      tipo: 'prac',
      id: 'prac-9',
      dia: 'jueves',
      inicio: '14:30',
      fin: '16:00',
      aula: 'IN-208',
      title: '9 - Fazzito',
      linkedCommissionId: '9',
      sourceSubjectId: '36',
      sourceSubjectLabel: 'Otra',
    },
  ],
  ...overrides,
});

const applySetter = <T,>(setter: ReturnType<typeof vi.fn>, prev: T): T => {
  const lastArg = setter.mock.calls.at(-1)?.[0] as T | ((value: T) => T);
  if (typeof lastArg === 'function') return (lastArg as (value: T) => T)(prev);
  return lastArg;
};

describe('useEventCardInteractions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maneja hover/mouseleave con conflicto y respeta external', () => {
    const setHoveredConflictEventId = vi.fn();
    const setHoveredCommissionId = vi.fn();
    const { result } = renderHook(() =>
      useEventCardInteractions({
        slot: makeSlot(),
        hasConflict: true,
        hoveredConflictEventId: 'prac-21',
        setHoveredConflictEventId,
        setHoveredCommissionId,
        setPinnedCommissionId: vi.fn(),
        setStackIndexBySlot: vi.fn(),
        onToggleEnrollment: vi.fn(),
      })
    );

    result.current.onCardMouseEnter({} as never);
    expect(setHoveredConflictEventId).toHaveBeenCalledWith('prac-21');
    expect(setHoveredCommissionId).toHaveBeenCalledWith('21');

    result.current.onCardMouseLeave({} as never);
    expect(setHoveredCommissionId).toHaveBeenCalledTimes(1);
    expect(setHoveredConflictEventId).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(applySetter<string | null>(setHoveredCommissionId, '21')).toBeNull();
    expect(applySetter<string | null>(setHoveredConflictEventId, 'prac-21')).toBeNull();

    const { result: externalResult } = renderHook(() =>
      useEventCardInteractions({
        slot: makeSlot({
          event: { ...makeSlot().event, isExternal: true },
        }),
        hasConflict: true,
        hoveredConflictEventId: null,
        setHoveredConflictEventId,
        setHoveredCommissionId,
        setPinnedCommissionId: vi.fn(),
        setStackIndexBySlot: vi.fn(),
        onToggleEnrollment: vi.fn(),
      })
    );
    setHoveredConflictEventId.mockClear();
    setHoveredCommissionId.mockClear();
    externalResult.current.onCardMouseEnter({} as never);
    expect(setHoveredConflictEventId).not.toHaveBeenCalled();
    expect(setHoveredCommissionId).not.toHaveBeenCalled();
  });

  it('togglea pin con click/teclado y guarda comisión desde botón', () => {
    const setPinnedCommissionId = vi.fn();
    const onToggleEnrollment = vi.fn();
    const { result } = renderHook(() =>
      useEventCardInteractions({
        slot: makeSlot(),
        hasConflict: false,
        hoveredConflictEventId: null,
        setHoveredConflictEventId: vi.fn(),
        setHoveredCommissionId: vi.fn(),
        setPinnedCommissionId,
        setStackIndexBySlot: vi.fn(),
        onToggleEnrollment,
      })
    );

    result.current.onCardClick({} as never);
    expect(applySetter<string | null>(setPinnedCommissionId, '21')).toBeNull();

    const preventDefault = vi.fn();
    result.current.onCardKeyDown({ key: 'Enter', preventDefault } as never);
    expect(preventDefault).toHaveBeenCalled();

    const stopPropagation = vi.fn();
    result.current.onSaveButtonClick({ stopPropagation } as never);
    expect(stopPropagation).toHaveBeenCalled();
    expect(onToggleEnrollment).toHaveBeenCalledWith('21');
  });

  it('navega stack prev/next con wrap y actualiza hover de comisión visible', () => {
    const setStackIndexBySlot = vi.fn();
    const setHoveredCommissionId = vi.fn();
    const { result } = renderHook(() =>
      useEventCardInteractions({
        slot: makeSlot(),
        hasConflict: false,
        hoveredConflictEventId: null,
        setHoveredConflictEventId: vi.fn(),
        setHoveredCommissionId,
        setPinnedCommissionId: vi.fn(),
        setStackIndexBySlot,
        onToggleEnrollment: vi.fn(),
      })
    );

    const stopPropagationPrev = vi.fn();
    result.current.onStackPrevClick({ stopPropagation: stopPropagationPrev } as never);
    expect(stopPropagationPrev).toHaveBeenCalled();
    expect(applySetter<Record<string, number>>(setStackIndexBySlot, {})).toEqual({
      'jueves|14:30|16:00': 1,
    });
    expect(setHoveredCommissionId).toHaveBeenLastCalledWith('9');

    const stopPropagationNext = vi.fn();
    result.current.onStackNextClick({ stopPropagation: stopPropagationNext } as never);
    expect(stopPropagationNext).toHaveBeenCalled();
    expect(setHoveredCommissionId).toHaveBeenLastCalledWith('9');
  });

  it('no limpia hover si durante el grace period ya entró a otra comisión', () => {
    const setHoveredConflictEventId = vi.fn();
    const setHoveredCommissionId = vi.fn();
    const { result } = renderHook(() =>
      useEventCardInteractions({
        slot: makeSlot(),
        hasConflict: true,
        hoveredConflictEventId: 'prac-21',
        setHoveredConflictEventId,
        setHoveredCommissionId,
        setPinnedCommissionId: vi.fn(),
        setStackIndexBySlot: vi.fn(),
        onToggleEnrollment: vi.fn(),
      })
    );

    result.current.onCardMouseLeave({} as never);
    vi.advanceTimersByTime(200);

    expect(applySetter<string | null>(setHoveredCommissionId, '9')).toBe('9');
    expect(applySetter<string | null>(setHoveredConflictEventId, 'prac-9')).toBe('prac-9');
  });
});

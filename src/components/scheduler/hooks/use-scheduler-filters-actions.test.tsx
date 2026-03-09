import { describe, expect, it, vi } from 'vitest';
import { useSchedulerFiltersActions } from './use-scheduler-filters-actions';
import type { VenueCode } from '../scheduler.types';

function applyStateSetter<T>(setter: (next: T | ((prev: T) => T)) => void, prev: T) {
  const calls = vi.mocked(setter).mock.calls;
  const lastArg = calls[calls.length - 1]?.[0] as T | ((value: T) => T);
  return typeof lastArg === 'function' ? (lastArg as (value: T) => T)(prev) : lastArg;
}

describe('useSchedulerFiltersActions', () => {
  it('togglea sedes y comisiones, y setOnlyContent activa solo el tipo elegido', () => {
    const setSelectedVenues = vi.fn();
    const setSelectedCommissionIds = vi.fn();
    const setShowComisiones = vi.fn();
    const setShowTeoricos = vi.fn();
    const setShowSeminarios = vi.fn();
    const setShowOtherSubjects = vi.fn();

    const actions = useSchedulerFiltersActions({
      searchedComisiones: [],
      setSelectedVenues,
      setShowComisiones,
      setShowTeoricos,
      setShowSeminarios,
      setShowOtherSubjects,
      setSelectedCommissionIds,
      setPinnedCommissionId: vi.fn(),
      setHoveredCommissionId: vi.fn(),
    });

    actions.toggleVenue('HY');
    expect(applyStateSetter(setSelectedVenues, new Set<VenueCode>(['IN', 'HY']))).toEqual(
      new Set(['IN'])
    );

    actions.toggleCommission('63');
    expect(applyStateSetter(setSelectedCommissionIds, new Set(['9']))).toEqual(
      new Set(['9', '63'])
    );

    actions.setOnlyContent('teoricos');
    expect(setShowComisiones).toHaveBeenLastCalledWith(false);
    expect(setShowTeoricos).toHaveBeenLastCalledWith(true);
    expect(setShowSeminarios).toHaveBeenLastCalledWith(false);
    expect(setShowOtherSubjects).toHaveBeenLastCalledWith(false);
  });

  it('selecciona todas las visibles y luego clearVisible limpia visibles y resetea hover/pin', () => {
    const setSelectedCommissionIds = vi.fn();
    const setPinnedCommissionId = vi.fn();
    const setHoveredCommissionId = vi.fn();

    const actions = useSchedulerFiltersActions({
      searchedComisiones: [{ id: '9' } as never, { id: '63' } as never],
      setSelectedVenues: vi.fn(),
      setShowComisiones: vi.fn(),
      setShowTeoricos: vi.fn(),
      setShowSeminarios: vi.fn(),
      setShowOtherSubjects: vi.fn(),
      setSelectedCommissionIds,
      setPinnedCommissionId,
      setHoveredCommissionId,
    });

    actions.selectAllVisible();
    expect(applyStateSetter(setSelectedCommissionIds, new Set(['1']))).toEqual(
      new Set(['1', '9', '63'])
    );

    actions.clearVisible();
    expect(applyStateSetter(setSelectedCommissionIds, new Set(['1', '9', '63', '70']))).toEqual(
      new Set(['1', '70'])
    );
    expect(setPinnedCommissionId).toHaveBeenCalledWith(null);
    expect(setHoveredCommissionId).toHaveBeenCalledWith(null);
  });
});

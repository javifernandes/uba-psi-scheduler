import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSubjectDropdown } from './use-subject-dropdown';
import type { SubjectData } from '../scheduler.types';

const subjects: SubjectData[] = [
  {
    id: '36',
    label: '(2) Psicología Social - Cátedra 36 (II)',
    header: 'Psicología UBA - II - Zubieta',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
  {
    id: '35',
    label: '(2) Psicología Social - Cátedra 35 (I)',
    header: 'Psicología UBA - I - Vodovotz',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
  {
    id: '34',
    label: '(1) Historia de la Psicología - Cátedra 34 (II)',
    header: 'Psicología UBA - II - Ibarra',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
];

type HookParams = Parameters<typeof useSubjectDropdown>[0];

const baseParams = (overrides: Partial<HookParams> = {}): HookParams => ({
  subjects,
  selectedSubjectId: '35',
  selectedSubjectLabel: '(2) Psicología Social - Cátedra 35 (I)',
  setSelectedSubjectId: vi.fn(),
  ...overrides,
});

describe('useSubjectDropdown', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrupa por materia y ordena por código de materia y número de cátedra', () => {
    const { result } = renderHook(() => useSubjectDropdown(baseParams()));

    expect(result.current.groupedSubjectOptions.map(g => g.groupLabel)).toEqual([
      '1 · Historia de la Psicología',
      '2 · Psicología Social',
    ]);
    expect(result.current.groupedSubjectOptions[1]?.options.map(option => option.id)).toEqual([
      '35',
      '36',
    ]);
  });

  it('filtra materias por query y mantiene lista aplanada sincronizada', () => {
    const { result } = renderHook(() => useSubjectDropdown(baseParams()));

    act(() => {
      result.current.onMateriaInputChange('ibarra');
    });

    expect(result.current.materiaSearch).toBe('ibarra');
    expect(result.current.flatSelectableSubjects.map(subject => subject.id)).toEqual(['34']);
  });

  it('abre con ArrowDown y selecciona con Enter la opción destacada', async () => {
    const setSelectedSubjectId = vi.fn();
    const { result } = renderHook(() =>
      useSubjectDropdown(
        baseParams({
          selectedSubjectId: '999',
          selectedSubjectLabel: 'No seleccionada',
          setSelectedSubjectId,
        })
      )
    );

    act(() => {
      result.current.onMateriaInputKeyDown({
        key: 'ArrowDown',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    await waitFor(() => {
      expect(result.current.isMateriaDropdownOpen).toBe(true);
    });
    expect(result.current.highlightedSubjectIndex).toBe(0);

    act(() => {
      result.current.onMateriaInputKeyDown({
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(setSelectedSubjectId).toHaveBeenCalledWith('34');
    expect(result.current.isMateriaDropdownOpen).toBe(false);
  });

  it('cierra con Escape global y con click fuera cuando está abierto', async () => {
    const { result } = renderHook(() => useSubjectDropdown(baseParams()));

    act(() => {
      result.current.setIsMateriaDropdownOpen(true);
    });

    await waitFor(() => {
      expect(result.current.isMateriaDropdownOpen).toBe(true);
    });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    await waitFor(() => {
      expect(result.current.isMateriaDropdownOpen).toBe(false);
    });

    act(() => {
      result.current.setIsMateriaDropdownOpen(true);
    });

    await waitFor(() => {
      expect(result.current.isMateriaDropdownOpen).toBe(true);
    });

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    await waitFor(() => {
      expect(result.current.isMateriaDropdownOpen).toBe(false);
    });
  });

  it('durante el paso select-subject del tour ignora click fuera para no cerrar dropdown', async () => {
    document.body.dataset.schedulerTourStep = 'select-subject';
    const { result } = renderHook(() => useSubjectDropdown(baseParams()));

    act(() => {
      result.current.setIsMateriaDropdownOpen(true);
    });

    await waitFor(() => {
      expect(result.current.isMateriaDropdownOpen).toBe(true);
    });

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    await waitFor(() => {
      expect(result.current.isMateriaDropdownOpen).toBe(true);
    });

    delete document.body.dataset.schedulerTourStep;
  });

});

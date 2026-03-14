import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSchedulerSubjectsData } from './use-scheduler-subjects-data';
import type { SubjectData } from '../scheduler.types';
import { subjectFromLegacyFixture } from '@/test/subject-fixture';

const subjects: SubjectData[] = [
  subjectFromLegacyFixture({
    id: '50',
    label: '(16) Psicoanálisis Freud - Cátedra 50 (II)',
    header: 'h50',
    teoricos: ['II|jueves|09:15|10:45|Láznik|IN-MAY|'],
    seminarios: ['B|martes|09:15|10:45|Battaglia|HY-005|'],
    comisiones: [
      '63|martes|07:30|09:00|BLANK Sofia|III - B|IN-123||35',
      '9|viernes|09:15|10:45|Israel Ana|IV - A|HY-124||0',
      '12|martes|11:00|12:30|Kohan Pablo|III - B|SI-016||',
    ],
  }),
  subjectFromLegacyFixture({
    id: '34',
    label: '(1) Historia de la Psicología - Cátedra 34 (II)',
    header: 'h34',
    teoricos: ['I|miércoles|11:00|12:30|Ibarra|HY-014|'],
    seminarios: ['A|jueves|09:15|10:45|Falcone|IN-510|'],
    comisiones: ['1|jueves|11:00|12:30|Boisselier|I - A|IN-125||20'],
  }),
  subjectFromLegacyFixture({
    id: '298',
    label: 'Neurofisiopatología - Cátedra 298',
    header: 'h298',
    teoricos: [],
    seminarios: [],
    comisiones: ['14|sabado|09:15|10:45|Politis|V|AV 028||8'],
  }),
];

type HookParams = Parameters<typeof useSchedulerSubjectsData>[0];

const baseParams = (overrides: Partial<HookParams> = {}): HookParams => ({
  subjects,
  selectedSubjectId: '50',
  enrolledBySubject: {},
  commissionQuery: '',
  showOnlyWithVacancies: false,
  onSubjectChanged: vi.fn(),
  ...overrides,
});

describe('useSchedulerSubjectsData', () => {
  it('inicializa sedes y comisiones seleccionadas al cambiar de materia y dispara callback', async () => {
    const onSubjectChanged = vi.fn();
    const { result, rerender } = renderHook(
      ({ params }: { params: HookParams }) => useSchedulerSubjectsData(params),
      {
        initialProps: {
          params: baseParams({ onSubjectChanged }),
        },
      }
    );

    await waitFor(() => {
      expect(Array.from(result.current.selectedCommissionIds).sort()).toEqual(['12', '63', '9']);
    });
    expect(result.current.allVenues).toEqual(['IN', 'HY', 'SI']);

    rerender({
      params: baseParams({
        selectedSubjectId: '34',
        onSubjectChanged,
      }),
    });

    await waitFor(() => {
      expect(Array.from(result.current.selectedCommissionIds)).toEqual(['1']);
    });
    expect(result.current.allVenues).toEqual(['IN', 'HY']);
    expect(onSubjectChanged).toHaveBeenCalledTimes(2);
  });

  it('filtra por sede y por query, y ordena búsqueda por número de comisión', async () => {
    const { result } = renderHook(() => useSchedulerSubjectsData(baseParams()));

    await waitFor(() => {
      expect(result.current.filteredComisiones.map((c) => c.id)).toEqual(['63', '12', '9']);
    });

    act(() => {
      result.current.setSelectedVenues(new Set(['HY']));
    });

    await waitFor(() => {
      expect(result.current.filteredComisiones.map((c) => c.id)).toEqual(['9']);
      expect(result.current.selectedComisiones.map((c) => c.id)).toEqual(['9']);
    });

    const { result: queriedResult } = renderHook(() =>
      useSchedulerSubjectsData(baseParams({ commissionQuery: 'martes' }))
    );
    await waitFor(() => {
      expect(queriedResult.current.searchedComisiones.map((c) => c.id)).toEqual(['12', '63']);
    });
  });

  it('si el filtro de vacantes está activo oculta solo comisiones con vacantes 0', async () => {
    const { result } = renderHook(() =>
      useSchedulerSubjectsData(baseParams({ showOnlyWithVacancies: true }))
    );

    await waitFor(() => {
      expect(result.current.filteredComisiones.map((c) => c.id)).toEqual(['63', '12']);
      expect(result.current.filteredComisiones.map((c) => c.vacantes)).toEqual([35, null]);
    });
  });

  it('sin materia seleccionada no devuelve comisiones ni sedes activas', async () => {
    const onSubjectChanged = vi.fn();
    const { result } = renderHook(() =>
      useSchedulerSubjectsData(
        baseParams({
          selectedSubjectId: '',
          onSubjectChanged,
        })
      )
    );

    await waitFor(() => {
      expect(result.current.selectedSubject).toBeNull();
      expect(result.current.filteredComisiones).toEqual([]);
      expect(result.current.allVenues).toEqual([]);
      expect(Array.from(result.current.selectedCommissionIds)).toEqual([]);
    });
    expect(onSubjectChanged).toHaveBeenCalledTimes(1);
  });

  it('incluye sedes dinámicas de materias externas guardadas', async () => {
    const { result } = renderHook(() =>
      useSchedulerSubjectsData(
        baseParams({
          selectedSubjectId: '',
          enrolledBySubject: { '34': '1', '298': '14' },
        })
      )
    );

    await waitFor(() => {
      expect(result.current.allVenues).toEqual(['IN', 'HY', 'AV']);
    });
  });
});

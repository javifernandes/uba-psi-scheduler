import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSchedulerPersistence } from './use-scheduler-persistence';
import type { SubjectData } from '../scheduler.types';
import { enrollmentStorageKeyForScope } from '../scheduler.utils';
import { useAppStore } from '@/store/app-store';

const subjects: SubjectData[] = [
  {
    id: '34',
    label: '(2) Psicología Social - Cátedra 34 (II)',
    header: 'h34',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
  {
    id: '35',
    label: '(2) Psicología Social - Cátedra 35 (I)',
    header: 'h35',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
  {
    id: '60',
    label: '(10) Estadística - Cátedra 60 (I)',
    header: 'h60',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
];
const TEST_PERIOD = '2026-01';
const TEST_CAREER = 'lic-psicologia';
const TEST_STORAGE_KEY = enrollmentStorageKeyForScope(TEST_CAREER, TEST_PERIOD);

describe('useSchedulerPersistence', () => {
  let storage: Map<string, string>;

  beforeEach(() => {
    useAppStore.setState({ enrolledBySubject: {} });
    storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storage.delete(key);
      }),
      clear: vi.fn(() => storage.clear()),
    });
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    useAppStore.setState({ enrolledBySubject: {} });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('toma materia desde query param m cuando existe y es válida', async () => {
    window.history.replaceState(null, '', '/?m=35');
    const { result } = renderHook(() =>
      useSchedulerPersistence({ subjects, period: TEST_PERIOD, careerSlug: TEST_CAREER })
    );
    await waitFor(() => {
      expect(result.current.selectedSubjectId).toBe('35');
    });
  });

  it('arranca sin materia seleccionada cuando no hay query param m', async () => {
    const { result } = renderHook(() =>
      useSchedulerPersistence({ subjects, period: TEST_PERIOD, careerSlug: TEST_CAREER })
    );
    await waitFor(() => {
      expect(result.current.selectedSubjectId).toBe('');
    });
  });

  it('normaliza enrollments dejando una sola cátedra por código de materia', async () => {
    storage.set(
      TEST_STORAGE_KEY,
      JSON.stringify({
        '34': '21',
        '35': '4',
        unknown: 'x',
      })
    );
    const { result } = renderHook(() =>
      useSchedulerPersistence({ subjects, period: TEST_PERIOD, careerSlug: TEST_CAREER })
    );

    await waitFor(() => {
      expect(result.current.enrolledBySubject).toEqual({ '35': '4' });
    });
  });

  it('applyEnrollmentRule reemplaza selección previa de la misma materia y permite limpiar', () => {
    const { result } = renderHook(() =>
      useSchedulerPersistence({ subjects, period: TEST_PERIOD, careerSlug: TEST_CAREER })
    );

    const replaced = result.current.applyEnrollmentRule({ '34': '21', '60': '7' }, '35', '4');
    expect(replaced).toEqual({ '35': '4', '60': '7' });

    const cleared = result.current.applyEnrollmentRule(replaced, '35', undefined);
    expect(cleared).toEqual({ '60': '7' });
  });

  it('persiste en localStorage cambios de enrolledBySubject', async () => {
    const { result } = renderHook(() =>
      useSchedulerPersistence({ subjects, period: TEST_PERIOD, careerSlug: TEST_CAREER })
    );

    await act(async () => {
      result.current.setEnrolledBySubject({ '60': '3' });
    });

    await waitFor(() => {
      expect(storage.get(TEST_STORAGE_KEY)).toBe(JSON.stringify({ '60': '3' }));
    });
  });

  it('hidrata enrollments cuando subjects llega después del primer render', async () => {
    storage.set(
      TEST_STORAGE_KEY,
      JSON.stringify({
        '35': '4',
      })
    );

    const { result, rerender } = renderHook(
      ({ data }: { data: SubjectData[] }) =>
        useSchedulerPersistence({
          subjects: data,
          period: TEST_PERIOD,
          careerSlug: TEST_CAREER,
        }),
      {
        initialProps: { data: [] as SubjectData[] },
      }
    );

    expect(result.current.enrolledBySubject).toEqual({});

    rerender({ data: subjects });

    await waitFor(() => {
      expect(result.current.enrolledBySubject).toEqual({ '35': '4' });
    });
  });
});

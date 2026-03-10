import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSchedulerCallbacks } from './use-scheduler-callbacks';
import { captureEvent } from '@/lib/posthog';

vi.mock('@/lib/posthog', () => ({
  captureEvent: vi.fn(),
}));

const applySetter = <T,>(setter: ReturnType<typeof vi.fn>, prev: T): T => {
  const lastArg = setter.mock.calls.at(-1)?.[0] as T | ((value: T) => T);
  if (typeof lastArg === 'function') return (lastArg as (value: T) => T)(prev);
  return lastArg;
};

describe('useSchedulerCallbacks', () => {
  it('genera callbacks de filtros con telemetry', () => {
    const toggleVenue = vi.fn();
    const setOnlyContent = vi.fn();
    const setSelectedSubjectId = vi.fn();

    const { result } = renderHook(() =>
      useSchedulerCallbacks({
        selectedSubject: { id: '34' },
        currentPeriod: '2026-01',
        careerSlug: 'lic-psicologia',
        selectedVenues: new Set(['IN']),
        searchedComisiones: [],
        selectedCommissionIds: new Set(),
        subjects: [],
        enrolledBySubject: {},
        applyEnrollmentRule: vi.fn((prev, _id, commissionId) =>
          commissionId ? { ...prev, '34': commissionId } : {}
        ),
        setSelectedSubjectId,
        setEnrolledBySubject: vi.fn(),
        toggleVenue,
        setOnlyVenue: vi.fn(),
        setOnlyContent,
        selectAllVisible: vi.fn(),
        clearVisible: vi.fn(),
        toggleCommission: vi.fn(),
      })
    );

    result.current.onClearSelectedSubject();
    expect(setSelectedSubjectId).toHaveBeenCalledWith('');
    expect(captureEvent).toHaveBeenCalledWith('scheduler_subject_cleared');

    result.current.onToggleVenue('IN');
    expect(toggleVenue).toHaveBeenCalledWith('IN');

    result.current.onSetOnlyContent('teoricos');
    expect(setOnlyContent).toHaveBeenCalledWith('teoricos');
  });

  it('resuelve toggle de inscripción usando applyEnrollmentRule', () => {
    const applyEnrollmentRule = vi.fn((prev, targetSubjectId, commissionId) => {
      if (!commissionId) return {};
      return { ...prev, [targetSubjectId]: commissionId };
    });
    const setEnrolledBySubject = vi.fn();

    const { result } = renderHook(() =>
      useSchedulerCallbacks({
        selectedSubject: { id: '34' },
        currentPeriod: '2026-01',
        careerSlug: 'lic-psicologia',
        selectedVenues: new Set(),
        searchedComisiones: [],
        selectedCommissionIds: new Set(),
        subjects: [],
        enrolledBySubject: {},
        applyEnrollmentRule,
        setSelectedSubjectId: vi.fn(),
        setEnrolledBySubject,
        toggleVenue: vi.fn(),
        setOnlyVenue: vi.fn(),
        setOnlyContent: vi.fn(),
        selectAllVisible: vi.fn(),
        clearVisible: vi.fn(),
        toggleCommission: vi.fn(),
      })
    );

    result.current.onToggleEnrollment('21');
    expect(applySetter<Record<string, string>>(setEnrolledBySubject, {})).toEqual({ '34': '21' });

    result.current.onToggleEnrollment('21');
    expect(applySetter<Record<string, string>>(setEnrolledBySubject, { '34': '21' })).toEqual({});
  });

  it('exporta selecciones usando el período activo', async () => {
    const { result } = renderHook(() =>
      useSchedulerCallbacks({
        selectedSubject: { id: '34' },
        currentPeriod: '2026-01',
        careerSlug: 'lic-psicologia',
        selectedVenues: new Set(),
        searchedComisiones: [],
        selectedCommissionIds: new Set(),
        subjects: [
          {
            id: '34',
            label: '(1) Historia de la Psicología - Cátedra 34 (II)',
            header: 'h34',
            teoricos: [],
            seminarios: [],
            comisiones: ['21|lunes|10:00|12:00|Docente|II|IN-101|'],
          },
        ],
        enrolledBySubject: { '34': '21' },
        applyEnrollmentRule: vi.fn(),
        setSelectedSubjectId: vi.fn(),
        setEnrolledBySubject: vi.fn(),
        toggleVenue: vi.fn(),
        setOnlyVenue: vi.fn(),
        setOnlyContent: vi.fn(),
        selectAllVisible: vi.fn(),
        clearVisible: vi.fn(),
        toggleCommission: vi.fn(),
      })
    );

    const objectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const anchor = {
      href: '',
      download: '',
      click: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLAnchorElement;
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(anchor as unknown as HTMLElementTagNameMap['a']);
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => anchor as unknown as Node);

    try {
      result.current.onExportSelections();
      const exportedBlob = objectUrlSpy.mock.calls[0]?.[0] as Blob;
      const payload = JSON.parse(await exportedBlob.text()) as { period: string };
      expect(payload.period).toBe('2026-01');
    } finally {
      appendChildSpy.mockRestore();
      createElementSpy.mockRestore();
      revokeSpy.mockRestore();
      objectUrlSpy.mockRestore();
    }
  });
});

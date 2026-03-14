import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSavedElectionsViewModel } from './use-saved-elections-view-model';
import { useAppStore } from '@/store/app-store';
import type { SubjectData } from '../scheduler.types';
import { subjectFromLegacyFixture } from '@/test/subject-fixture';

vi.mock('@/lib/posthog', () => ({
  captureEvent: vi.fn(),
}));

const subjectsFixture: SubjectData[] = [
  subjectFromLegacyFixture({
    id: '34',
    label: '(1) Historia de la Psicología - Cátedra 34 (II)',
    header: 'header',
    teoricos: [],
    seminarios: [],
    comisiones: ['21|lunes|10:00|12:00|Docente|II|IN-101|'],
  }),
];

describe('useSavedElectionsViewModel', () => {
  beforeEach(() => {
    useAppStore.setState({
      subjects: subjectsFixture,
      currentPeriod: '2026-01',
      enrolledBySubject: { '34': '21' },
    });
  });

  afterEach(() => {
    useAppStore.setState({ enrolledBySubject: {} });
    vi.restoreAllMocks();
  });

  it('borra una elección y limpia todas', () => {
    const { result } = renderHook(() => useSavedElectionsViewModel());

    act(() => {
      result.current.onRemoveSavedSubject('34');
    });
    expect(useAppStore.getState().enrolledBySubject).toEqual({});

    act(() => {
      useAppStore.getState().setEnrolledBySubject({ '34': '21' });
      result.current.onRemoveAllSavedSubjects();
    });
    expect(useAppStore.getState().enrolledBySubject).toEqual({});
  });

  it('exporta con el período activo del store', async () => {
    const { result } = renderHook(() => useSavedElectionsViewModel());
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

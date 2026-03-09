import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSchedulerTelemetryEffects } from './use-scheduler-telemetry-effects';
import { captureEvent } from '@/lib/posthog';

vi.mock('@/lib/posthog', () => ({
  captureEvent: vi.fn(),
}));

describe('useSchedulerTelemetryEffects', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(captureEvent).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('envia telemetry de cambio de materia solo desde la segunda selección', () => {
    const { rerender } = renderHook(
      ({ selectedSubjectId }: { selectedSubjectId: string | null }) =>
        useSchedulerTelemetryEffects({
          careerSlug: 'lic-psicologia',
          selectedSubject: selectedSubjectId
            ? ({ id: selectedSubjectId, label: selectedSubjectId } as never)
            : null,
          isCommissionDropdownOpen: false,
          commissionQuery: '',
          searchedComisionesLength: 0,
        }),
      {
        initialProps: { selectedSubjectId: null },
      }
    );

    rerender({ selectedSubjectId: '34' });
    expect(captureEvent).not.toHaveBeenCalledWith(
      'scheduler_subject_changed',
      expect.anything()
    );

    rerender({ selectedSubjectId: '35' });
    expect(captureEvent).toHaveBeenCalledWith('scheduler_subject_changed', {
      subject_id: '35',
      subject_label: '35',
    });
  });

  it('envia telemetry de dropdown y query', async () => {
    const { rerender } = renderHook(
      ({ open, query }: { open: boolean; query: string }) =>
        useSchedulerTelemetryEffects({
          careerSlug: 'lic-psicologia',
          selectedSubject: ({ id: '34', label: 'x' } as never),
          isCommissionDropdownOpen: open,
          commissionQuery: query,
          searchedComisionesLength: 3,
        }),
      {
        initialProps: { open: false, query: '' },
      }
    );

    rerender({ open: true, query: '' });
    expect(captureEvent).toHaveBeenCalledWith('scheduler_commission_dropdown_opened', {
      career_slug: 'lic-psicologia',
      selected_subject_id: '34',
      visible_count: 3,
    });

    rerender({ open: false, query: 'ab' });
    expect(captureEvent).toHaveBeenCalledWith('scheduler_commission_dropdown_closed', {
      career_slug: 'lic-psicologia',
      had_query: true,
      query_length: 2,
    });

    vi.advanceTimersByTime(450);
    expect(captureEvent).toHaveBeenCalledWith('scheduler_commission_query_changed', {
      career_slug: 'lic-psicologia',
      selected_subject_id: '34',
      query_length: 2,
      result_count: 3,
    });
  });
});

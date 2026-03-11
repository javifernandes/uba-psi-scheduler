import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { captureEvent } from '@/lib/posthog';
import type { Comision, VenueCode } from '../scheduler.types';

type UseSchedulerCallbacksParams = {
  selectedSubject: { id: string } | null;
  careerSlug: string;
  selectedVenues: Set<VenueCode>;
  searchedComisiones: Comision[];
  selectedCommissionIds: Set<string>;
  applyEnrollmentRule: (
    prev: Record<string, string>,
    targetSubjectId: string,
    commissionId: string | undefined
  ) => Record<string, string>;
  setSelectedSubjectId: (value: string) => void;
  setEnrolledBySubject: Dispatch<SetStateAction<Record<string, string>>>;
  toggleVenue: (venue: VenueCode) => void;
  setOnlyVenue: (venue: VenueCode) => void;
  setOnlyContent: (type: 'comisiones' | 'teoricos' | 'seminarios' | 'otras') => void;
  selectAllVisible: () => void;
  clearVisible: () => void;
  toggleCommission: (commissionId: string) => void;
};

export const useSchedulerCallbacks = ({
  selectedSubject,
  careerSlug,
  selectedVenues,
  searchedComisiones,
  selectedCommissionIds,
  applyEnrollmentRule,
  setSelectedSubjectId,
  setEnrolledBySubject,
  toggleVenue,
  setOnlyVenue,
  setOnlyContent,
  selectAllVisible,
  clearVisible,
  toggleCommission,
}: UseSchedulerCallbacksParams) => {
  const onToggleEnrollment = useCallback(
    (commissionId: string) => {
      setEnrolledBySubject((prev) => {
        if (!selectedSubject) return prev;
        const isRemoving = prev[selectedSubject.id] === commissionId;
        captureEvent('scheduler_enrollment_toggled', {
          subject_id: selectedSubject.id,
          commission_id: commissionId,
          action: isRemoving ? 'remove' : 'set',
        });
        if (prev[selectedSubject.id] === commissionId) {
          return applyEnrollmentRule(prev, selectedSubject.id, undefined);
        }
        return applyEnrollmentRule(prev, selectedSubject.id, commissionId);
      });
    },
    [applyEnrollmentRule, selectedSubject, setEnrolledBySubject]
  );

  const onClearSelectedSubject = useCallback(() => {
    captureEvent('scheduler_subject_cleared');
    setSelectedSubjectId('');
  }, [setSelectedSubjectId]);

  const onToggleVenue = useCallback(
    (venue: VenueCode) => {
      const selectedBefore = selectedVenues.has(venue);
      captureEvent('scheduler_venue_toggled', {
        career_slug: careerSlug,
        selected_subject_id: selectedSubject?.id || '',
        venue,
        selected_before: selectedBefore,
        selected_after: !selectedBefore,
      });
      toggleVenue(venue);
    },
    [careerSlug, selectedSubject?.id, selectedVenues, toggleVenue]
  );

  const onSetOnlyVenue = useCallback(
    (venue: VenueCode) => {
      captureEvent('scheduler_venue_set_only', {
        career_slug: careerSlug,
        selected_subject_id: selectedSubject?.id || '',
        venue,
      });
      setOnlyVenue(venue);
    },
    [careerSlug, selectedSubject?.id, setOnlyVenue]
  );

  const onSetOnlyContent = useCallback(
    (contentType: 'comisiones' | 'teoricos' | 'seminarios' | 'otras') => {
      captureEvent('scheduler_content_set_only', { content_type: contentType });
      setOnlyContent(contentType);
    },
    [setOnlyContent]
  );

  const onSelectAllVisible = useCallback(() => {
    captureEvent('scheduler_commissions_select_all_visible', {
      visible_count: searchedComisiones.length,
    });
    selectAllVisible();
  }, [searchedComisiones.length, selectAllVisible]);

  const onClearVisible = useCallback(() => {
    captureEvent('scheduler_commissions_clear_visible', {
      visible_count: searchedComisiones.length,
    });
    clearVisible();
  }, [clearVisible, searchedComisiones.length]);

  const onToggleCommission = useCallback(
    (commissionId: string) => {
      captureEvent('scheduler_commission_toggled', {
        commission_id: commissionId,
        selected_before: selectedCommissionIds.has(commissionId),
      });
      toggleCommission(commissionId);
    },
    [selectedCommissionIds, toggleCommission]
  );

  return {
    onToggleEnrollment,
    onClearSelectedSubject,
    onToggleVenue,
    onSetOnlyVenue,
    onSetOnlyContent,
    onSelectAllVisible,
    onClearVisible,
    onToggleCommission,
  };
};

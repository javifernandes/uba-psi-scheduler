import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { captureEvent } from '@/lib/posthog';
import type { Comision, SubjectData, VenueCode } from '../scheduler.types';
import {
  buildEnrollmentsExportPayload,
  catedraNumberFromLabel,
  mapProjectionEnrollmentsToSubjectMap,
  parseEnrollmentsImportPayload,
  type EnrollmentProjectionMappedEntry,
  type EnrollmentProjectionRejectedEntry,
} from '../scheduler.utils';

type ImportPreviewData = {
  period: string;
  totalEntries: number;
  mapped: EnrollmentProjectionMappedEntry[];
  rejected: EnrollmentProjectionRejectedEntry[];
  mappedBySubject: Record<string, string>;
};

type UseSchedulerCallbacksParams = {
  selectedSubject: { id: string } | null;
  careerSlug: string;
  selectedVenues: Set<VenueCode>;
  searchedComisiones: Comision[];
  selectedCommissionIds: Set<string>;
  subjects: SubjectData[];
  enrolledBySubject: Record<string, string>;
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
  subjects,
  enrolledBySubject,
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
      setEnrolledBySubject(prev => {
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

  const onRemoveSavedSubject = useCallback(
    (subjectId: string) => {
      setEnrolledBySubject(prev => {
        captureEvent('scheduler_saved_subject_removed', { subject_id: subjectId });
        const next = { ...prev };
        delete next[subjectId];
        return next;
      });
    },
    [setEnrolledBySubject]
  );

  const onRemoveAllSavedSubjects = useCallback(() => {
    setEnrolledBySubject(prev => {
      const removed_count = Object.keys(prev).length;
      captureEvent('scheduler_saved_subjects_cleared', { removed_count });
      return {};
    });
  }, [setEnrolledBySubject]);

  const onExportSelections = useCallback(() => {
    if (typeof window === 'undefined') return;
    const period = (() => {
      const now = new Date();
      const year = now.getFullYear();
      const term = now.getMonth() < 7 ? '01' : '02';
      return `${year}-${term}`;
    })();
    const projectedEnrollments = Object.entries(enrolledBySubject).reduce<
      Array<{ catedra: number; comision: number | string }>
    >((acc, [subjectId, commissionId]) => {
      const subject = subjects.find(item => item.id === subjectId);
      if (!subject) return acc;
      const catedra = catedraNumberFromLabel(subject.label);
      if (!Number.isFinite(catedra)) return acc;
      acc.push({
        catedra,
        comision: /^\d+$/.test(commissionId) ? Number.parseInt(commissionId, 10) : commissionId,
      });
      return acc;
    }, []);
    const payload = buildEnrollmentsExportPayload(projectedEnrollments, period);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+$/, '');
    link.href = url;
    link.download = `uba-psi-elecciones-v${payload.version}-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    captureEvent('scheduler_saved_subjects_exported', {
      total_subjects: Object.keys(enrolledBySubject).length,
    });
  }, [enrolledBySubject, subjects]);

  const onImportSelections = useCallback(
    async (file: File): Promise<ImportPreviewData> => {
      const raw = await file.text();
      const parsed = parseEnrollmentsImportPayload(raw);
      const mapped = mapProjectionEnrollmentsToSubjectMap(parsed.enrollments, subjects);
      return {
        period: parsed.period,
        totalEntries: parsed.enrollments.length,
        mapped: mapped.mapped,
        rejected: mapped.rejected,
        mappedBySubject: mapped.mappedBySubject,
      };
    },
    [subjects]
  );

  const onApplyImportSelections = useCallback(
    async (preview: ImportPreviewData) => {
      if (preview.totalEntries > 0 && Object.keys(preview.mappedBySubject).length === 0) {
        throw new Error(
          'No se pudo mapear ninguna elección. Verificá que el archivo corresponda a esta oferta/carrera.'
        );
      }
      setEnrolledBySubject(preview.mappedBySubject);
      captureEvent('scheduler_saved_subjects_imported', {
        imported_subjects: preview.totalEntries,
        applied_subjects: Object.keys(preview.mappedBySubject).length,
        rejected_subjects: preview.rejected.length,
      });
    },
    [setEnrolledBySubject]
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
    onRemoveSavedSubject,
    onRemoveAllSavedSubjects,
    onExportSelections,
    onImportSelections,
    onApplyImportSelections,
  };
};

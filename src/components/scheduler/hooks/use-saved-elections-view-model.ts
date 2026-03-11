import { useCallback } from 'react';
import { captureEvent } from '@/lib/posthog';
import { useAppStore } from '@/store/app-store';
import {
  mapProjectionEnrollmentsToSubjectMap,
  parseEnrollmentsImportPayload,
} from '../scheduler.utils';
import type { SavedElectionsImportPreview } from '@/domain/saved-elections';

export const useSavedElectionsViewModel = () => {
  const subjects = useAppStore((state) => state.subjects);
  const currentPeriod = useAppStore((state) => state.currentPeriod);
  const enrolledBySubject = useAppStore((state) => state.enrolledBySubject);
  const removeSavedSubject = useAppStore((state) => state.removeSavedSubject);
  const clearSavedSubjects = useAppStore((state) => state.clearSavedSubjects);
  const applyImportedSelections = useAppStore((state) => state.applyImportedSelections);
  const buildExportProjection = useAppStore((state) => state.buildExportProjection);

  const onRemoveSavedSubject = useCallback(
    (subjectId: string) => {
      captureEvent('scheduler_saved_subject_removed', { subject_id: subjectId });
      removeSavedSubject(subjectId);
    },
    [removeSavedSubject]
  );

  const onRemoveAllSavedSubjects = useCallback(() => {
    captureEvent('scheduler_saved_subjects_cleared', {
      removed_count: Object.keys(enrolledBySubject).length,
    });
    clearSavedSubjects();
  }, [clearSavedSubjects, enrolledBySubject]);

  const onExportSelections = useCallback(() => {
    if (typeof window === 'undefined') return;
    const payload = buildExportProjection(subjects, currentPeriod);
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
  }, [buildExportProjection, currentPeriod, enrolledBySubject, subjects]);

  const onImportSelections = useCallback(
    async (file: File): Promise<SavedElectionsImportPreview> => {
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
    async (preview: SavedElectionsImportPreview) => {
      applyImportedSelections(preview);
      captureEvent('scheduler_saved_subjects_imported', {
        imported_subjects: preview.totalEntries,
        applied_subjects: Object.keys(preview.mappedBySubject).length,
        rejected_subjects: preview.rejected.length,
      });
    },
    [applyImportedSelections]
  );

  return {
    onRemoveSavedSubject,
    onRemoveAllSavedSubjects,
    onExportSelections,
    onImportSelections,
    onApplyImportSelections,
  };
};

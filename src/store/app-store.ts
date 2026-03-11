import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SetStateAction } from 'react';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import { buildEnrollmentsExportPayload, sameRecord } from '@/components/scheduler/scheduler.utils';
import {
  buildProjectedEnrollments,
  validateImportPreview,
  type SavedElectionsImportPreview,
} from '@/domain/saved-elections';
import type { PeriodId } from '@/lib/period';
import { CURRENT_PERIOD } from '@/lib/current-period';

type BootstrapOfferInput = {
  period: PeriodId;
  careerSlug: string;
  careerLabel: string;
  subjects: SubjectData[];
};

type AppStoreState = {
  currentPeriod: PeriodId;
  currentCareerSlug: string;
  currentCareerLabel: string;
  subjects: SubjectData[];
  enrolledBySubject: Record<string, string>;
  loadedAt: string;
  bootstrapOffer: (input: BootstrapOfferInput) => void;
  setEnrolledBySubject: (next: SetStateAction<Record<string, string>>) => void;
  removeSavedSubject: (subjectId: string) => void;
  clearSavedSubjects: () => void;
  applyImportedSelections: (preview: SavedElectionsImportPreview) => void;
  buildExportProjection: (
    subjects: SubjectData[],
    period: string
  ) => ReturnType<typeof buildEnrollmentsExportPayload>;
  resetOffer: () => void;
};

const EMPTY_OFFER = {
  currentPeriod: CURRENT_PERIOD,
  currentCareerSlug: '',
  currentCareerLabel: '',
  subjects: [],
  enrolledBySubject: {},
  loadedAt: '',
};

export const useAppStore = create<AppStoreState>()(
  devtools(
    (set, get) => ({
      ...EMPTY_OFFER,
      bootstrapOffer: (input) =>
        set(
          {
            currentPeriod: input.period,
            currentCareerSlug: input.careerSlug,
            currentCareerLabel: input.careerLabel,
            subjects: input.subjects,
            loadedAt: new Date().toISOString(),
          },
          false,
          'appStore/bootstrapOffer'
        ),
      setEnrolledBySubject: (next) =>
        set(
          (state) => {
            const resolved = typeof next === 'function' ? next(state.enrolledBySubject) : next;
            if (sameRecord(state.enrolledBySubject, resolved)) return state;
            return { enrolledBySubject: resolved };
          },
          false,
          'appStore/setEnrolledBySubject'
        ),
      removeSavedSubject: (subjectId) =>
        set(
          (state) => {
            if (!state.enrolledBySubject[subjectId]) return state;
            const next = { ...state.enrolledBySubject };
            delete next[subjectId];
            return { enrolledBySubject: next };
          },
          false,
          'appStore/removeSavedSubject'
        ),
      clearSavedSubjects: () =>
        set(
          (state) => {
            if (Object.keys(state.enrolledBySubject).length === 0) return state;
            return { enrolledBySubject: {} };
          },
          false,
          'appStore/clearSavedSubjects'
        ),
      applyImportedSelections: (preview) =>
        set(
          (state) => {
            validateImportPreview(preview);
            if (sameRecord(state.enrolledBySubject, preview.mappedBySubject)) return state;
            return { enrolledBySubject: preview.mappedBySubject };
          },
          false,
          'appStore/applyImportedSelections'
        ),
      buildExportProjection: (subjects, period) =>
        buildEnrollmentsExportPayload(
          buildProjectedEnrollments(get().enrolledBySubject, subjects),
          period
        ),
      resetOffer: () => set(EMPTY_OFFER, false, 'appStore/resetOffer'),
    }),
    {
      name: 'uba-psi-scheduler/app-store',
    }
  )
);

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
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
  loadedAt: string;
  bootstrapOffer: (input: BootstrapOfferInput) => void;
  resetOffer: () => void;
};

const EMPTY_OFFER = {
  currentPeriod: CURRENT_PERIOD,
  currentCareerSlug: '',
  currentCareerLabel: '',
  subjects: [],
  loadedAt: '',
};

export const useAppStore = create<AppStoreState>()(
  devtools(
    set => ({
      ...EMPTY_OFFER,
      bootstrapOffer: input =>
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
      resetOffer: () => set(EMPTY_OFFER, false, 'appStore/resetOffer'),
    }),
    {
      name: 'uba-psi-scheduler/app-store',
    }
  )
);

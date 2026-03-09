import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import { SavedElectionsPanel } from './SavedElectionsPanel';
import { SchedulerFiltersPanel } from './SchedulerFiltersPanel';

type SchedulerRightPanelProps = {
  isEleccionesPanelOpen: boolean;
  filtersPanelProps: ComponentProps<typeof SchedulerFiltersPanel>;
  savedElectionsPanelProps: ComponentProps<typeof SavedElectionsPanel>;
};

export const SchedulerRightPanel = ({
  isEleccionesPanelOpen,
  filtersPanelProps,
  savedElectionsPanelProps,
}: SchedulerRightPanelProps) => (
  <aside className="grid min-h-0 gap-2 md:grid-cols-2 xl:flex xl:h-full xl:flex-col">
    <SchedulerFiltersPanel {...filtersPanelProps} />
    <div className={cn('order-5 min-h-0 md:col-span-2', isEleccionesPanelOpen && 'xl:flex-1')}>
      <SavedElectionsPanel {...savedElectionsPanelProps} />
    </div>
  </aside>
);

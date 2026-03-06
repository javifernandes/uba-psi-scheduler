import type { Dispatch, SetStateAction } from 'react';
import type { Comision, VenueCode } from '../psicologia-scheduler.types';

type UseSchedulerFiltersActionsParams = {
  searchedComisiones: Comision[];
  setSelectedVenues: Dispatch<SetStateAction<Set<VenueCode>>>;
  setShowComisiones: Dispatch<SetStateAction<boolean>>;
  setShowTeoricos: Dispatch<SetStateAction<boolean>>;
  setShowSeminarios: Dispatch<SetStateAction<boolean>>;
  setShowOtherSubjects: Dispatch<SetStateAction<boolean>>;
  setSelectedCommissionIds: Dispatch<SetStateAction<Set<string>>>;
  setPinnedCommissionId: Dispatch<SetStateAction<string | null>>;
  setHoveredCommissionId: Dispatch<SetStateAction<string | null>>;
};

export const useSchedulerFiltersActions = ({
  searchedComisiones,
  setSelectedVenues,
  setShowComisiones,
  setShowTeoricos,
  setShowSeminarios,
  setShowOtherSubjects,
  setSelectedCommissionIds,
  setPinnedCommissionId,
  setHoveredCommissionId,
}: UseSchedulerFiltersActionsParams) => {
  const toggleVenue = (venue: VenueCode) =>
    setSelectedVenues(prev => {
      const next = new Set(prev);
      if (next.has(venue)) next.delete(venue);
      else next.add(venue);
      return next;
    });

  const setOnlyVenue = (venue: VenueCode) => setSelectedVenues(new Set([venue]));

  const setOnlyContent = (type: 'comisiones' | 'teoricos' | 'seminarios' | 'otras') => {
    setShowComisiones(type === 'comisiones');
    setShowTeoricos(type === 'teoricos');
    setShowSeminarios(type === 'seminarios');
    setShowOtherSubjects(type === 'otras');
  };

  const toggleCommission = (id: string) =>
    setSelectedCommissionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAllVisible = () => {
    setSelectedCommissionIds(prev => {
      const next = new Set(prev);
      searchedComisiones.forEach(c => next.add(c.id));
      return next;
    });
  };

  const clearVisible = () => {
    const visible = new Set(searchedComisiones.map(c => c.id));
    setSelectedCommissionIds(prev => {
      const next = new Set(prev);
      Array.from(next).forEach(id => {
        if (visible.has(id)) next.delete(id);
      });
      return next;
    });
    setPinnedCommissionId(null);
    setHoveredCommissionId(null);
  };

  return {
    toggleVenue,
    setOnlyVenue,
    setOnlyContent,
    toggleCommission,
    selectAllVisible,
    clearVisible,
  };
};

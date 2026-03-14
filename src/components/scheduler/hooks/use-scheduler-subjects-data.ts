import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type {
  Comision,
  ParsedSubject,
  Seminario,
  SubjectData,
  Teorico,
  VenueCode,
} from '../scheduler.types';
import {
  findPrimaryAssociatedSlotId,
  matchesCommissionQuery,
  parseSubject,
  sameSetValues,
  slotById,
  slotsByTipo,
  sortVenueCodes,
  sortComisiones,
  venueCodeFromAula,
} from '../scheduler.utils';

type UseSchedulerSubjectsDataParams = {
  subjects: SubjectData[];
  selectedSubjectId: string;
  enrolledBySubject: Record<string, string>;
  commissionQuery: string;
  showOnlyWithVacancies: boolean;
  onSubjectChanged: () => void;
};

type UseSchedulerSubjectsDataResult = {
  parsedSubjects: ParsedSubject[];
  selectedSubject: ParsedSubject | null;
  allVenues: VenueCode[];
  selectedVenues: Set<VenueCode>;
  setSelectedVenues: Dispatch<SetStateAction<Set<VenueCode>>>;
  selectedCommissionIds: Set<string>;
  setSelectedCommissionIds: Dispatch<SetStateAction<Set<string>>>;
  filteredComisiones: Comision[];
  filteredTeoricos: Teorico[];
  filteredSeminarios: Seminario[];
  selectedComisiones: Comision[];
  searchedComisiones: Comision[];
};

export const useSchedulerSubjectsData = ({
  subjects,
  selectedSubjectId,
  enrolledBySubject,
  commissionQuery,
  showOnlyWithVacancies,
  onSubjectChanged,
}: UseSchedulerSubjectsDataParams): UseSchedulerSubjectsDataResult => {
  const [selectedVenues, setSelectedVenues] = useState<Set<VenueCode>>(
    new Set<VenueCode>(['IN', 'SI', 'HY'])
  );
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<Set<string>>(new Set());
  const onSubjectChangedRef = useRef(onSubjectChanged);
  const allVenuesRef = useRef<VenueCode[]>([]);
  const comisionesRef = useRef<Comision[]>([]);

  useEffect(() => {
    onSubjectChangedRef.current = onSubjectChanged;
  }, [onSubjectChanged]);

  const parsedSubjects = useMemo(() => subjects.map(parseSubject), [subjects]);
  const selectedSubject = useMemo(
    () => parsedSubjects.find((subject) => subject.id === selectedSubjectId) || null,
    [selectedSubjectId, parsedSubjects]
  );

  const teoricos = useMemo(
    () => (selectedSubject ? slotsByTipo(selectedSubject, 'teo') : []),
    [selectedSubject]
  );
  const seminarios = useMemo(
    () => (selectedSubject ? slotsByTipo(selectedSubject, 'sem') : []),
    [selectedSubject]
  );
  const comisiones = useMemo(() => selectedSubject?.comisiones || [], [selectedSubject]);

  const allVenues = useMemo(() => {
    const found = new Set<VenueCode>();
    [...teoricos, ...seminarios, ...comisiones].forEach((item) => {
      found.add(venueCodeFromAula(item.lugar));
    });
    parsedSubjects
      .filter((subject) => subject.id !== selectedSubjectId)
      .forEach((subject) => {
        const enrolledCommissionId = enrolledBySubject[subject.id];
        if (!enrolledCommissionId) return;
        const enrolledCommission = subject.comisiones.find(
          (item) => item.id === enrolledCommissionId
        );
        if (!enrolledCommission) return;
        found.add(venueCodeFromAula(enrolledCommission.lugar));
        const teoricoId = findPrimaryAssociatedSlotId(enrolledCommission, 'teo');
        if (teoricoId) {
          const linkedSlot = slotById(subject, teoricoId);
          const teorico = linkedSlot?.tipo === 'teo' ? linkedSlot : undefined;
          if (teorico) found.add(venueCodeFromAula(teorico.lugar));
        }
        const seminarioId = findPrimaryAssociatedSlotId(enrolledCommission, 'sem');
        if (seminarioId) {
          const linkedSlot = slotById(subject, seminarioId);
          const seminario = linkedSlot?.tipo === 'sem' ? linkedSlot : undefined;
          if (seminario) found.add(venueCodeFromAula(seminario.lugar));
        }
      });
    return sortVenueCodes(found);
  }, [comisiones, enrolledBySubject, parsedSubjects, selectedSubjectId, seminarios, teoricos]);

  useEffect(() => {
    allVenuesRef.current = allVenues;
    comisionesRef.current = comisiones;
  }, [allVenues, comisiones]);

  useEffect(() => {
    setSelectedVenues((prev) => {
      const next = new Set(allVenuesRef.current);
      return sameSetValues(prev, next) ? prev : next;
    });
    setSelectedCommissionIds((prev) => {
      const next = new Set(comisionesRef.current.map((c) => c.id));
      return sameSetValues(prev, next) ? prev : next;
    });
    onSubjectChangedRef.current();
  }, [selectedSubjectId]);

  const filteredComisiones = useMemo(
    () =>
      sortComisiones(
        comisiones.filter((c) => {
          if (!selectedVenues.has(venueCodeFromAula(c.lugar))) return false;
          if (!showOnlyWithVacancies) return true;
          return c.vacantes !== 0;
        })
      ),
    [comisiones, selectedVenues, showOnlyWithVacancies]
  );

  const filteredTeoricos = useMemo(
    () => teoricos.filter((t) => selectedVenues.has(venueCodeFromAula(t.lugar))),
    [selectedVenues, teoricos]
  );

  const filteredSeminarios = useMemo(
    () => seminarios.filter((s) => selectedVenues.has(venueCodeFromAula(s.lugar))),
    [selectedVenues, seminarios]
  );

  const selectedComisiones = useMemo(() => {
    const visibleIds = new Set(filteredComisiones.map((c) => c.id));
    return filteredComisiones.filter(
      (c) => selectedCommissionIds.has(c.id) && visibleIds.has(c.id)
    );
  }, [filteredComisiones, selectedCommissionIds]);

  const searchedComisiones = useMemo(
    () =>
      [...filteredComisiones.filter((c) => matchesCommissionQuery(c, commissionQuery))].sort(
        (a, b) => Number.parseInt(a.id, 10) - Number.parseInt(b.id, 10)
      ),
    [filteredComisiones, commissionQuery]
  );

  return {
    parsedSubjects,
    selectedSubject,
    allVenues,
    selectedVenues,
    setSelectedVenues,
    selectedCommissionIds,
    setSelectedCommissionIds,
    filteredComisiones,
    filteredTeoricos,
    filteredSeminarios,
    selectedComisiones,
    searchedComisiones,
  };
};

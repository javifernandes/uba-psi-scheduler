import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type {
  Comision,
  ParsedSubject,
  SubjectData,
  VenueCode,
} from '../psicologia-scheduler.types';
import {
  matchesCommissionQuery,
  parseSubject,
  sameSetValues,
  sortComisiones,
  venueCodeFromAula,
} from '../psicologia-scheduler.utils';

type UseSchedulerSubjectsDataParams = {
  subjects: SubjectData[];
  selectedSubjectId: string;
  commissionQuery: string;
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
  filteredTeoricos: ParsedSubject['teoricos'];
  filteredSeminarios: ParsedSubject['seminarios'];
  selectedComisiones: Comision[];
  searchedComisiones: Comision[];
};

export const useSchedulerSubjectsData = ({
  subjects,
  selectedSubjectId,
  commissionQuery,
  onSubjectChanged,
}: UseSchedulerSubjectsDataParams): UseSchedulerSubjectsDataResult => {
  const [selectedVenues, setSelectedVenues] = useState<Set<VenueCode>>(
    new Set<VenueCode>(['IN', 'SI', 'HY'])
  );
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<Set<string>>(new Set());

  const parsedSubjects = useMemo(() => subjects.map(parseSubject), [subjects]);
  const selectedSubject = useMemo(
    () => parsedSubjects.find(subject => subject.id === selectedSubjectId) || null,
    [selectedSubjectId, parsedSubjects]
  );

  const teoricos = selectedSubject?.teoricos || [];
  const seminarios = selectedSubject?.seminarios || [];
  const comisiones = selectedSubject?.comisiones || [];

  const allVenues = useMemo(() => {
    const found = new Set<VenueCode>();
    [...teoricos, ...seminarios, ...comisiones].forEach(item =>
      found.add(venueCodeFromAula(item.aula))
    );
    return (['IN', 'HY', 'SI', 'OTRO'] as VenueCode[]).filter(code => found.has(code));
  }, [teoricos, seminarios, comisiones]);

  useEffect(() => {
    setSelectedVenues(prev => {
      const next = new Set(allVenues);
      return sameSetValues(prev, next) ? prev : next;
    });
    setSelectedCommissionIds(prev => {
      const next = new Set(comisiones.map(c => c.id));
      return sameSetValues(prev, next) ? prev : next;
    });
    onSubjectChanged();
  }, [selectedSubjectId]);

  const filteredComisiones = useMemo(
    () => sortComisiones(comisiones.filter(c => selectedVenues.has(venueCodeFromAula(c.aula)))),
    [selectedVenues, comisiones]
  );

  const filteredTeoricos = useMemo(
    () => teoricos.filter(t => selectedVenues.has(venueCodeFromAula(t.aula))),
    [selectedVenues, teoricos]
  );

  const filteredSeminarios = useMemo(
    () => seminarios.filter(s => selectedVenues.has(venueCodeFromAula(s.aula))),
    [selectedVenues, seminarios]
  );

  const selectedComisiones = useMemo(() => {
    const visibleIds = new Set(filteredComisiones.map(c => c.id));
    return filteredComisiones.filter(c => selectedCommissionIds.has(c.id) && visibleIds.has(c.id));
  }, [filteredComisiones, selectedCommissionIds]);

  const searchedComisiones = useMemo(
    () =>
      [...filteredComisiones.filter(c => matchesCommissionQuery(c, commissionQuery))].sort(
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

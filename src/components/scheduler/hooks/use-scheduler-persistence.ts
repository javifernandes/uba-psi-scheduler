import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { SubjectData } from "../scheduler.types";
import { ENROLLMENTS_STORAGE_KEY, sameRecord } from "../scheduler.utils";
import {
  applyEnrollmentRule as applyEnrollmentRuleDomain,
  normalizeEnrollmentMap,
} from "@/domain/enrollment";
import { indexMaterias } from "@/domain/materia";
import { useQueryParamState } from "@/hooks/browser/use-query-param-state";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

type UseSchedulerPersistenceParams = {
  subjects: SubjectData[];
};

type UseSchedulerPersistenceResult = {
  selectedSubjectId: string;
  setSelectedSubjectId: Dispatch<SetStateAction<string>>;
  enrolledBySubject: Record<string, string>;
  setEnrolledBySubject: Dispatch<SetStateAction<Record<string, string>>>;
  materiaCodeBySubjectId: Record<string, string>;
  applyEnrollmentRule: (
    prev: Record<string, string>,
    targetSubjectId: string,
    commissionId: string | undefined,
  ) => Record<string, string>;
};

export const useSchedulerPersistence = ({
  subjects,
}: UseSchedulerPersistenceParams): UseSchedulerPersistenceResult => {
  const subjectIdSet = useMemo(
    () => new Set(subjects.map((subject) => subject.id)),
    [subjects],
  );
  const materiaCodeBySubjectId = useMemo(
    () => indexMaterias(subjects),
    [subjects],
  );
  const subjectsSignature = useMemo(
    () => subjects.map((subject) => `${subject.id}:${subject.label}`).join("|"),
    [subjects],
  );

  const [selectedSubjectId, setSelectedSubjectId] = useQueryParamState({
    key: "m",
    parseFromQuery: (rawValue) =>
      rawValue && subjectIdSet.has(rawValue) ? rawValue : "",
    serializeToQuery: (value) => (value ? value : null),
  });

  const [enrolledBySubject, setEnrolledBySubject] = useLocalStorageState<
    Record<string, string>
  >({
    key: ENROLLMENTS_STORAGE_KEY,
    defaultValue: {},
    enabled: subjects.length > 0,
    normalize: (raw) => normalizeEnrollmentMap(raw, materiaCodeBySubjectId),
    isEqual: sameRecord,
    readVersion: subjectsSignature,
  });

  const applyEnrollmentRule = (
    prev: Record<string, string>,
    targetSubjectId: string,
    commissionId: string | undefined,
  ) =>
    applyEnrollmentRuleDomain(
      prev,
      targetSubjectId,
      commissionId,
      materiaCodeBySubjectId,
    );

  return {
    selectedSubjectId,
    setSelectedSubjectId,
    enrolledBySubject,
    setEnrolledBySubject,
    materiaCodeBySubjectId,
    applyEnrollmentRule,
  };
};

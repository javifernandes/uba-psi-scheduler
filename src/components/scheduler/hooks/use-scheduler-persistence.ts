import { type Dispatch, type SetStateAction } from "react";
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
  const subjectIdSet = new Set(subjects.map((subject) => subject.id));
  const materiaCodeBySubjectId = indexMaterias(subjects);
  const rehydrateToken = subjects
    .map((subject) => `${subject.id}:${subject.label}`)
    .join("|");

  const [selectedSubjectId, setSelectedSubjectId] = useQueryParamState({
    key: "m",
    parseFromQuery: (raw) => (raw && subjectIdSet.has(raw) ? raw : ""),
    serializeToQuery: (value) => (value ? value : null),
  });

  const [enrolledBySubject, setEnrolledBySubject] = useLocalStorageState<
    Record<string, string>
  >({
    key: ENROLLMENTS_STORAGE_KEY,
    defaultValue: EMPTY_ENROLLMENTS,
    enabled: subjects.length > 0,
    normalize: (raw) => normalizeEnrollmentMap(raw, materiaCodeBySubjectId),
    isEqual: sameRecord,
    rehydrateToken,
  });

  return {
    selectedSubjectId,
    setSelectedSubjectId,
    enrolledBySubject,
    setEnrolledBySubject,
    materiaCodeBySubjectId,

    applyEnrollmentRule: (
      prev: Record<string, string>,
      targetSubjectId: string,
      commissionId: string | undefined,
    ) =>
      applyEnrollmentRuleDomain(
        prev,
        targetSubjectId,
        commissionId,
        materiaCodeBySubjectId,
      ),
  };
};

const EMPTY_ENROLLMENTS: Record<string, string> = {};

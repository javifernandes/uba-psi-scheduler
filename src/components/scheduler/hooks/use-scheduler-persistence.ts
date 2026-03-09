import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { SubjectData } from "../scheduler.types";
import { ENROLLMENTS_STORAGE_KEY, sameRecord } from "../scheduler.utils";
import {
  applyEnrollmentRule as applyEnrollmentRuleDomain,
  normalizeEnrollmentMap,
} from "@/domain/enrollment";
import { indexMaterias } from "@/domain/materia";
import { useQueryParamState } from "@/hooks/browser/use-query-param-state";
import { useLocalPersistence } from "@/hooks/use-local-persistence";

type UseSchedulerPersistenceParams = {
  subjects: SubjectData[];
  storageKey: string;
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
  storageKey,
}: UseSchedulerPersistenceParams): UseSchedulerPersistenceResult => {
  const localPersistence = useLocalPersistence();
  const persistenceKey = storageKey || ENROLLMENTS_STORAGE_KEY;
  const [selectedSubjectId, setSelectedSubjectId] = useState(() => {
    if (typeof window === "undefined") return "";
    if (!subjects.length) return "";
    const subjectIdFromUrl = new URLSearchParams(window.location.search).get(
      "m",
    );
    if (
      subjectIdFromUrl &&
      subjects.some((subject) => subject.id === subjectIdFromUrl)
    ) {
      return subjectIdFromUrl;
    }
    return "";
  });
  const [enrolledBySubject, setEnrolledBySubject] = useState<
    Record<string, string>
  >({});
  const [enrollmentsLoaded, setEnrollmentsLoaded] = useState(false);
  const [enrollmentsHydrated, setEnrollmentsHydrated] = useState(false);

  const subjectIdSet = useMemo(
    () => new Set(subjects.map((subject) => subject.id)),
    [subjects],
  );
  const materiaCodeBySubjectId = useMemo(
    () => indexMaterias(subjects),
    [subjects],
  );

  const applyEnrollmentRule = useCallback(
    (
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
    [materiaCodeBySubjectId],
  );

  const parseSubjectIdFromQuery = useCallback(
    (rawValue: string | null) =>
      rawValue && subjectIdSet.has(rawValue) ? rawValue : "",
    [subjectIdSet],
  );

  useQueryParamState({
    key: "m",
    value: selectedSubjectId,
    setValue: setSelectedSubjectId,
    parseFromQuery: parseSubjectIdFromQuery,
    serializeToQuery: (value) => (value ? value : null),
  });

  useEffect(() => {
    if (enrollmentsHydrated) return;
    if (!subjects.length) return;
    const normalized = localPersistence.readJSON<
      Record<string, string>,
      Record<string, string>
    >(persistenceKey, {
      defaultValue: {},
      normalize: (raw) => normalizeEnrollmentMap(raw, materiaCodeBySubjectId),
    });
    setEnrolledBySubject((prev) =>
      sameRecord(prev, normalized) ? prev : normalized,
    );
    setEnrollmentsHydrated(true);
    setEnrollmentsLoaded(true);
  }, [
    subjects,
    enrollmentsHydrated,
    localPersistence,
    materiaCodeBySubjectId,
    persistenceKey,
  ]);

  useEffect(() => {
    if (!enrollmentsLoaded) return;
    localPersistence.writeJSON(persistenceKey, enrolledBySubject);
  }, [enrolledBySubject, enrollmentsLoaded, localPersistence, persistenceKey]);

  return {
    selectedSubjectId,
    setSelectedSubjectId,
    enrolledBySubject,
    setEnrolledBySubject,
    materiaCodeBySubjectId,
    applyEnrollmentRule,
  };
};

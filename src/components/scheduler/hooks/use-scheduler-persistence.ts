import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { SubjectData } from "../scheduler.types";
import {
  ENROLLMENTS_STORAGE_KEY,
  materiaCodeFromLabel,
  sameRecord,
} from "../scheduler.utils";
import { useLocalStorage } from "@/hooks/use-local-storage";

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
  const storage = useLocalStorage();
  const persistenceKey = storageKey || ENROLLMENTS_STORAGE_KEY;
  const [selectedSubjectId, setSelectedSubjectId] = useState(() => {
    if (!subjects.length) return "";
    if (typeof window === "undefined") return "";
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
    () =>
      Object.fromEntries(
        subjects.map((subject) => [
          subject.id,
          materiaCodeFromLabel(subject.label),
        ]),
      ) as Record<string, string>,
    [subjects],
  );

  const normalizeEnrollmentMap = useCallback(
    (raw: Record<string, string>) => {
      const normalized: Record<string, string> = {};
      const byMateria: Record<string, string> = {};
      Object.entries(raw).forEach(([subjectId, commissionId]) => {
        const materiaCode = materiaCodeBySubjectId[subjectId];
        if (!materiaCode) return;
        byMateria[materiaCode] = subjectId;
        normalized[subjectId] = commissionId;
      });
      Object.keys(normalized).forEach((subjectId) => {
        const materiaCode = materiaCodeBySubjectId[subjectId];
        if (!materiaCode) return;
        if (byMateria[materiaCode] !== subjectId) delete normalized[subjectId];
      });
      return normalized;
    },
    [materiaCodeBySubjectId],
  );

  const applyEnrollmentRule = useCallback(
    (
      prev: Record<string, string>,
      targetSubjectId: string,
      commissionId: string | undefined,
    ) => {
      const next = { ...prev };
      if (!commissionId) {
        delete next[targetSubjectId];
        return next;
      }
      const targetMateriaCode = materiaCodeBySubjectId[targetSubjectId];
      Object.keys(next).forEach((subjectId) => {
        if (materiaCodeBySubjectId[subjectId] === targetMateriaCode)
          delete next[subjectId];
      });
      next[targetSubjectId] = commissionId;
      return next;
    },
    [materiaCodeBySubjectId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPopState = () => {
      const subjectIdFromUrl = new URLSearchParams(window.location.search).get(
        "m",
      );
      if (!subjectIdFromUrl || !subjectIdSet.has(subjectIdFromUrl)) {
        setSelectedSubjectId((prev) => (prev === "" ? prev : ""));
        return;
      }
      setSelectedSubjectId((prev) =>
        prev === subjectIdFromUrl ? prev : subjectIdFromUrl,
      );
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [subjectIdSet]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentUrl = new URL(window.location.href);
    if (!selectedSubjectId) {
      if (!currentUrl.searchParams.has("m")) return;
      currentUrl.searchParams.delete("m");
      window.history.replaceState(
        window.history.state,
        "",
        currentUrl.toString(),
      );
      return;
    }
    const currentSubjectIdInUrl = currentUrl.searchParams.get("m");
    if (currentSubjectIdInUrl === selectedSubjectId) return;
    currentUrl.searchParams.set("m", selectedSubjectId);
    window.history.replaceState(
      window.history.state,
      "",
      currentUrl.toString(),
    );
  }, [selectedSubjectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (enrollmentsHydrated) return;
    if (!subjects.length) return;
    try {
      const raw = storage.getItem(persistenceKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object") {
        const normalized = normalizeEnrollmentMap(parsed);
        setEnrolledBySubject((prev) =>
          sameRecord(prev, normalized) ? prev : normalized,
        );
      }
    } catch {
      // no-op
    } finally {
      setEnrollmentsHydrated(true);
      setEnrollmentsLoaded(true);
    }
  }, [
    subjects,
    enrollmentsHydrated,
    normalizeEnrollmentMap,
    persistenceKey,
    storage,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enrollmentsLoaded) return;
    storage.setItem(persistenceKey, JSON.stringify(enrolledBySubject));
  }, [enrolledBySubject, enrollmentsLoaded, persistenceKey, storage]);

  return {
    selectedSubjectId,
    setSelectedSubjectId,
    enrolledBySubject,
    setEnrolledBySubject,
    materiaCodeBySubjectId,
    applyEnrollmentRule,
  };
};

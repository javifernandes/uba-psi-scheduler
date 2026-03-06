import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type SetStateAction,
} from 'react';
import type { SubjectData } from '../psicologia-scheduler.types';
import { catedraNumberFromLabel, materiaGroupFromLabel } from '../psicologia-scheduler.utils';

export type SubjectGroup = {
  groupLabel: string;
  options: SubjectData[];
};

type UseSubjectDropdownParams = {
  subjects: SubjectData[];
  selectedSubjectId: string;
  selectedSubjectLabel: string;
  setSelectedSubjectId: Dispatch<SetStateAction<string>>;
};

export const useSubjectDropdown = ({
  subjects,
  selectedSubjectId,
  selectedSubjectLabel,
  setSelectedSubjectId,
}: UseSubjectDropdownParams) => {
  const [isMateriaDropdownOpen, setIsMateriaDropdownOpen] = useState(false);
  const [materiaInputValue, setMateriaInputValue] = useState(subjects[0]?.label || '');
  const [materiaSearch, setMateriaSearch] = useState('');
  const [highlightedSubjectIndex, setHighlightedSubjectIndex] = useState(0);

  const materiaDropdownRef = useRef<HTMLDivElement | null>(null);
  const materiaInputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    setMateriaInputValue(selectedSubjectLabel);
    if (!isMateriaDropdownOpen) setMateriaSearch('');
  }, [selectedSubjectLabel, isMateriaDropdownOpen]);

  const filteredSubjects = useMemo(() => {
    const query = materiaSearch.trim().toLowerCase();
    if (!query) return subjects;
    return subjects.filter(
      subject =>
        subject.label.toLowerCase().includes(query) ||
        subject.header.toLowerCase().includes(query) ||
        subject.id.toLowerCase().includes(query)
    );
  }, [subjects, materiaSearch]);

  const groupedSubjectOptions = useMemo<SubjectGroup[]>(() => {
    const grouped = new Map<
      string,
      { groupKey: string; groupLabel: string; options: SubjectData[] }
    >();
    filteredSubjects.forEach(subject => {
      const group = materiaGroupFromLabel(subject.label);
      if (!grouped.has(group.label)) {
        grouped.set(group.label, { groupKey: group.key, groupLabel: group.label, options: [] });
      }
      grouped.get(group.label)?.options.push(subject);
    });

    return Array.from(grouped.values())
      .sort((a, b) => Number.parseInt(a.groupKey, 10) - Number.parseInt(b.groupKey, 10))
      .map(group => ({
        groupLabel: group.groupLabel,
        options: [...group.options].sort(
          (a, b) => catedraNumberFromLabel(a.label) - catedraNumberFromLabel(b.label)
        ),
      }));
  }, [filteredSubjects]);

  const flatSelectableSubjects = useMemo(
    () => groupedSubjectOptions.flatMap(group => group.options),
    [groupedSubjectOptions]
  );

  useEffect(() => {
    if (!isMateriaDropdownOpen) return;
    const currentIndex = flatSelectableSubjects.findIndex(
      subject => subject.id === selectedSubjectId
    );
    setHighlightedSubjectIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [isMateriaDropdownOpen, flatSelectableSubjects, selectedSubjectId]);

  useEffect(() => {
    if (!isMateriaDropdownOpen) return;
    if (highlightedSubjectIndex < flatSelectableSubjects.length) return;
    setHighlightedSubjectIndex(Math.max(0, flatSelectableSubjects.length - 1));
  }, [highlightedSubjectIndex, isMateriaDropdownOpen, flatSelectableSubjects.length]);

  useEffect(() => {
    if (!isMateriaDropdownOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!materiaDropdownRef.current?.contains(target)) setIsMateriaDropdownOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMateriaDropdownOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMateriaDropdownOpen]);

  const selectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setIsMateriaDropdownOpen(false);
    setMateriaSearch('');
  };

  const focusOptionByIndex = (index: number) => {
    const bounded = Math.max(0, Math.min(index, flatSelectableSubjects.length - 1));
    setHighlightedSubjectIndex(bounded);
    const subject = flatSelectableSubjects[bounded];
    if (!subject) return;
    requestAnimationFrame(() => optionRefs.current[subject.id]?.focus());
  };

  const onMateriaInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!isMateriaDropdownOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setIsMateriaDropdownOpen(true);
      requestAnimationFrame(() => {
        if (!flatSelectableSubjects.length) return;
        if (event.key === 'ArrowDown') {
          focusOptionByIndex(0);
          return;
        }
        focusOptionByIndex(flatSelectableSubjects.length - 1);
      });
      return;
    }
    if (!flatSelectableSubjects.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOptionByIndex(0);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOptionByIndex(flatSelectableSubjects.length - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const highlighted = flatSelectableSubjects[highlightedSubjectIndex];
      if (highlighted) selectSubject(highlighted.id);
      return;
    }
    if (event.key === ' ' && materiaSearch.trim().length === 0) {
      event.preventDefault();
      const highlighted = flatSelectableSubjects[highlightedSubjectIndex];
      if (highlighted) selectSubject(highlighted.id);
    }
  };

  return {
    isMateriaDropdownOpen,
    setIsMateriaDropdownOpen,
    materiaInputValue,
    materiaSearch,
    highlightedSubjectIndex,
    setHighlightedSubjectIndex,
    materiaDropdownRef,
    materiaInputRef,
    optionRefs,
    groupedSubjectOptions,
    flatSelectableSubjects,
    onMateriaInputChange: (value: string) => {
      setMateriaInputValue(value);
      setMateriaSearch(value);
    },
    selectSubject,
    focusOptionByIndex,
    onMateriaInputKeyDown,
  };
};

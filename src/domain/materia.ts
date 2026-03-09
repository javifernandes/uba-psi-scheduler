import type { SubjectData } from '@/components/scheduler/scheduler.types';

export const materiaCodeFromLabel = (label: string) => label.match(/^\((\d+)\)/)?.[1] || label;

export const indexMaterias = (subjects: SubjectData[]) =>
  Object.fromEntries(subjects.map(subject => [subject.id, materiaCodeFromLabel(subject.label)])) as Record<
    string,
    string
  >;

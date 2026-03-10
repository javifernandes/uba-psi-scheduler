import { indexMaterias } from './materia';
import type { SubjectData } from '@/components/scheduler/scheduler.types';

export const indexMateriaCodesBySubjectId = (subjects: SubjectData[]) => indexMaterias(subjects);

export const normalizeEnrollmentMap = (
  raw: Record<string, string>,
  materiaCodeBySubjectId: Record<string, string>
) => {
  const normalized: Record<string, string> = {};
  const byMateria: Record<string, string> = {};

  Object.entries(raw).forEach(([subjectId, commissionId]) => {
    const materiaCode = materiaCodeBySubjectId[subjectId];
    if (!materiaCode) return;
    byMateria[materiaCode] = subjectId;
    normalized[subjectId] = commissionId;
  });

  Object.keys(normalized).forEach(subjectId => {
    const materiaCode = materiaCodeBySubjectId[subjectId];
    if (!materiaCode) return;
    if (byMateria[materiaCode] !== subjectId) delete normalized[subjectId];
  });

  return normalized;
};

export const applyEnrollmentRule = (
  prev: Record<string, string>,
  targetSubjectId: string,
  commissionId: string | undefined,
  materiaCodeBySubjectId: Record<string, string>
) => {
  const next = { ...prev };
  if (!commissionId) {
    delete next[targetSubjectId];
    return next;
  }

  const targetMateriaCode = materiaCodeBySubjectId[targetSubjectId];
  Object.keys(next).forEach(subjectId => {
    if (materiaCodeBySubjectId[subjectId] === targetMateriaCode) {
      delete next[subjectId];
    }
  });

  next[targetSubjectId] = commissionId;
  return next;
};

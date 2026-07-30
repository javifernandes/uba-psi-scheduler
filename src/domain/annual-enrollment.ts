import type { SubjectData } from '@/components/scheduler/scheduler.types';
import type { PeriodId } from '@/lib/period';

const ANNUAL_CATEDRA_NUMBERS_BY_CAREER: Record<string, ReadonlySet<number>> = {
  'lic-psicologia': new Set([37, 38, 49, 50]),
};

const catedraNumberFromLabel = (label: string) => {
  const match = label.match(/Cátedra\s+(\d+)/i);
  return match?.[1] ? Number.parseInt(match[1], 10) : null;
};

export const previousPeriodForAnnualCarryOver = (period: PeriodId): PeriodId | null => {
  const match = period.match(/^(\d{4})-02$/);
  return match?.[1] ? (`${match[1]}-01` as PeriodId) : null;
};

export const isAnnualSubject = (careerSlug: string, subject: SubjectData) => {
  const annualCatedras = ANNUAL_CATEDRA_NUMBERS_BY_CAREER[careerSlug];
  const catedra = catedraNumberFromLabel(subject.label);
  return Boolean(annualCatedras && catedra !== null && annualCatedras.has(catedra));
};

export const buildAnnualCarryOver = ({
  careerSlug,
  previousSubjects,
  previousEnrollments,
}: {
  careerSlug: string;
  previousSubjects: SubjectData[];
  previousEnrollments: Record<string, string>;
}) => {
  const subjects = previousSubjects.filter((subject) => {
    const commissionId = previousEnrollments[subject.id];
    if (!commissionId || !isAnnualSubject(careerSlug, subject)) return false;
    return subject.slots.some((slot) => slot.tipo === 'prac' && slot.id === commissionId);
  });

  return {
    subjects,
    enrollments: Object.fromEntries(
      subjects.map((subject) => [subject.id, previousEnrollments[subject.id]!])
    ),
  };
};

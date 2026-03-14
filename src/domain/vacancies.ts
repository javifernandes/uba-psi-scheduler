import type { Comision, SubjectData } from '@/components/scheduler/scheduler.types';

export type VacancyStatus = 'sin_datos' | 'sin_cupo' | 'cupo_bajo' | 'cupo_disponible';
export type VacancyIndicator = {
  countLabel: string;
  status: VacancyStatus;
  filledBars: 0 | 1 | 2 | 3;
};

export const sumKnownVacancies = (comisiones: Array<Pick<Comision, 'vacantes'>>) =>
  comisiones.reduce(
    (total, comision) =>
      typeof comision.vacantes === 'number' ? total + comision.vacantes : total,
    0
  );

export const sumKnownVacanciesFromSubject = (subject: Pick<SubjectData, 'slots'>) =>
  subject.slots.reduce((total, slot) => {
    if (slot.tipo !== 'prac') return total;
    return typeof slot.vacantes === 'number' ? total + slot.vacantes : total;
  }, 0);

export const vacancyStatusFromVacancies = (vacancies: number | null): VacancyStatus => {
  if (vacancies === null) return 'sin_datos';
  if (vacancies === 0) return 'sin_cupo';
  if (vacancies <= 10) return 'cupo_bajo';
  return 'cupo_disponible';
};

export const vacancySummaryLine = (vacancies: number | null) => {
  if (vacancies === null) return 'Vacantes s/d · cupo s/d';
  const vacancyLabel = `${vacancies} ${vacancies === 1 ? 'vacante' : 'vacantes'}`;
  const statusLabel = vacancyStatusFromVacancies(vacancies).replaceAll('_', ' ');
  return `${vacancyLabel} · ${statusLabel}`;
};

export const vacancyIndicator = (vacancies: number | null): VacancyIndicator => {
  const status = vacancyStatusFromVacancies(vacancies);
  if (status === 'sin_datos') return { countLabel: '?', status, filledBars: 0 };
  if (status === 'sin_cupo') return { countLabel: '0', status, filledBars: 0 };
  if (status === 'cupo_bajo') return { countLabel: String(vacancies), status, filledBars: 1 };
  return { countLabel: String(vacancies), status, filledBars: 3 };
};

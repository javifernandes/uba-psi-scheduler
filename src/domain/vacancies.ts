import type { Comision, SubjectData } from '@/components/scheduler/scheduler.types';

export type VacancyStatus = 'sin_datos' | 'sin_cupo' | 'cupo_bajo' | 'cupo_disponible';
export type VacancyIndicator = {
  countLabel: string;
  status: VacancyStatus;
  filledBars: 0 | 1 | 2 | 3;
  hintLabel?: string;
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

export const vacancyStatusFromCapacity = (
  vacancies: number | null,
  maxVacanciesObserved?: number | null
): VacancyStatus => {
  if (vacancies === null) return 'sin_datos';
  if (vacancies === 0) return 'sin_cupo';
  if (typeof maxVacanciesObserved === 'number' && maxVacanciesObserved > 0) {
    const ratio = vacancies / maxVacanciesObserved;
    return ratio <= 0.2 ? 'cupo_bajo' : 'cupo_disponible';
  }
  return vacancyStatusFromVacancies(vacancies);
};

export const vacancySummaryLine = (
  vacancies: number | null,
  maxVacanciesObserved?: number | null
) => {
  if (vacancies === null) return 'Vacantes s/d · cupo s/d';
  const vacancyLabel = `${vacancies} ${vacancies === 1 ? 'vacante' : 'vacantes'}`;
  const statusLabel = vacancyStatusFromCapacity(vacancies, maxVacanciesObserved).replaceAll(
    '_',
    ' '
  );
  if (typeof maxVacanciesObserved === 'number' && maxVacanciesObserved > 0) {
    const ratio = Math.max(0, Math.min(1, vacancies / maxVacanciesObserved));
    const percentLabel = `${Math.round(ratio * 100)}%`;
    return `${vacancyLabel}/${maxVacanciesObserved} · ${percentLabel} · ${statusLabel}`;
  }
  return `${vacancyLabel} · ${statusLabel}`;
};

export const vacancyIndicator = (
  vacancies: number | null,
  maxVacanciesObserved?: number | null
): VacancyIndicator => {
  const status = vacancyStatusFromCapacity(vacancies, maxVacanciesObserved);
  if (status === 'sin_datos') return { countLabel: '?', status, filledBars: 0 };
  if (status === 'sin_cupo') return { countLabel: '0', status, filledBars: 0 };
  if (typeof vacancies !== 'number') return { countLabel: '?', status: 'sin_datos', filledBars: 0 };
  if (typeof maxVacanciesObserved === 'number' && maxVacanciesObserved > 0) {
    const safeRatio = Math.max(0, Math.min(1, vacancies / maxVacanciesObserved));
    const filledBars: 0 | 1 | 2 | 3 =
      vacancies === 0 ? 0 : safeRatio <= 0.2 ? 1 : safeRatio <= 0.66 ? 2 : 3;
    return {
      countLabel: `${vacancies}/${maxVacanciesObserved}`,
      status,
      filledBars,
      hintLabel: `${Math.round(safeRatio * 100)}%`,
    };
  }
  if (status === 'cupo_bajo') return { countLabel: String(vacancies), status, filledBars: 1 };
  return { countLabel: String(vacancies), status, filledBars: 3 };
};

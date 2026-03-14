import type { Comision, SubjectData } from '@/components/scheduler/scheduler.types';

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

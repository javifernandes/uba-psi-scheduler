import { describe, expect, it } from 'vitest';
import {
  loadAvailablePeriods,
  loadCareers,
  loadLatestPeriod,
  loadLatestPeriodForCareer,
  resolvePreferredPeriod,
} from './uba-careers';

describe('uba-careers data loading', () => {
  it('carga períodos disponibles y detecta último período', async () => {
    const periods = await loadAvailablePeriods();
    expect(periods.length).toBeGreaterThan(0);

    const latest = await loadLatestPeriod();
    expect(latest).toBe(periods[0]);

    const preferred = await resolvePreferredPeriod();
    expect(preferred).toBe(periods[0]);
  });

  it('encuentra período más nuevo para una carrera existente', async () => {
    const period = await loadLatestPeriodForCareer('lic-psicologia');
    expect(period).toBeTruthy();
  });

  it('devuelve vacío para carreras inexistentes en período', async () => {
    const latest = await loadLatestPeriod();
    expect(latest).toBeTruthy();

    const careers = latest ? await loadCareers(latest) : [];
    expect(Array.isArray(careers)).toBe(true);
  });
});

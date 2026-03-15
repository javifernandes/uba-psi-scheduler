import type { SubjectData } from '@/components/scheduler/scheduler.types';
import { normalizePeriod, type PeriodId } from '@/lib/period';

export type CareerWithLatestPeriod = {
  slug: string;
  label: string;
  latestPeriod: PeriodId;
  subjects: number;
};

export type VacancyAnalyticsPoint = {
  timestamp: string;
  knownVacancies: number;
  sinCupo: number;
  cupoBajo: number;
  cupoDisponible: number;
  sinDatos: number;
};

export type VacancyDropItem = {
  key: string;
  subjectId: string;
  subjectLabel: string;
  commissionId: string;
  delta: number;
  vacantes: number | null;
  capturedAt: string;
};

export type VacancyAnalytics = {
  lastProbeAt: string | null;
  totals: {
    knownVacancies: number;
    sinCupo: number;
    cupoBajo: number;
    cupoDisponible: number;
    sinDatos: number;
  };
  timeBounds: {
    startAt: string | null;
    endAt: string | null;
    nowAt: string;
    phase: 'before' | 'open' | 'closed' | 'unknown';
    daysTotal: number | null;
    daysElapsed: number | null;
    daysRemaining: number | null;
    activeWindowId: string | null;
    activeWindowLabel: string | null;
  };
  series: VacancyAnalyticsPoint[];
  topDrops: VacancyDropItem[];
};

const assertApiBase = () => {
  const apiBase = process.env.NEXT_PUBLIC_CONVEX_API_BASE || '';
  if (apiBase) return apiBase.replace(/\/$/, '');
  throw new Error(
    'Falta NEXT_PUBLIC_CONVEX_API_BASE. Configurá la URL base de endpoints HTTP de Convex.'
  );
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${assertApiBase()}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Error ${response.status} en ${path}${details ? `: ${details}` : ''}`);
  }

  return (await response.json()) as T;
};

const isCareerWithLatestPeriod = (value: unknown): value is CareerWithLatestPeriod => {
  if (!value || typeof value !== 'object') return false;
  const row = value as Partial<CareerWithLatestPeriod>;
  return (
    typeof row.slug === 'string' &&
    typeof row.label === 'string' &&
    typeof row.subjects === 'number' &&
    typeof row.latestPeriod === 'string' &&
    Boolean(normalizePeriod(row.latestPeriod))
  );
};

export const listCareersWithLatestPeriod = async (): Promise<CareerWithLatestPeriod[]> => {
  const data = await postJson<unknown>('/listCareersWithLatestPeriod', {});
  if (!Array.isArray(data)) return [];
  return data.filter(isCareerWithLatestPeriod).map((item) => ({
    ...item,
    latestPeriod: normalizePeriod(item.latestPeriod)!,
  }));
};

export const listPeriodsByCareer = async (careerSlug: string): Promise<PeriodId[]> => {
  const data = await postJson<unknown>('/listPeriodsByCareer', { careerSlug });
  if (!Array.isArray(data)) return [];
  return data
    .map((period) => (typeof period === 'string' ? normalizePeriod(period) : null))
    .filter((period): period is PeriodId => Boolean(period));
};

export const getOfferSubjects = async (
  careerSlug: string,
  period: PeriodId
): Promise<SubjectData[]> => {
  const data = await postJson<unknown>('/getOfferSubjects', { careerSlug, period });
  if (!Array.isArray(data)) return [];
  return data as SubjectData[];
};

export const getVacancyAnalytics = async (
  careerSlug: string,
  period: PeriodId,
  range: string
): Promise<VacancyAnalytics> =>
  postJson<VacancyAnalytics>('/getVacancyAnalytics', {
    careerSlug,
    period,
    range,
  });

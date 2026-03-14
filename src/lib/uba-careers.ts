import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import { CURRENT_PERIOD } from '@/lib/current-period';
import { isPeriodId, type PeriodId } from '@/lib/period';

export type CareerMeta = {
  code: string;
  slug: string;
  label: string;
  subjects: number;
};

type PeriodIndex = {
  periods: PeriodId[];
  latest: PeriodId | null;
  updatedAt: string;
};

const DATA_ROOT = path.join(process.cwd(), 'src/data/uba/psicologia/oferta');

const catedraNumber = (subject: SubjectData) =>
  Number.parseInt(subject.label.match(/Cátedra\s+(\d+)/i)?.[1] || '999999', 10);

const sortPeriodsDesc = (periods: PeriodId[]) =>
  [...periods].sort((a, b) => b.localeCompare(a, 'en'));

const parseCareerMeta = (raw: string): CareerMeta[] => {
  try {
    const parsed = JSON.parse(raw) as CareerMeta[];
    return (Array.isArray(parsed) ? parsed : []).filter(
      (item) =>
        typeof item?.code === 'string' &&
        typeof item?.slug === 'string' &&
        typeof item?.label === 'string' &&
        Number.isFinite(item?.subjects)
    );
  } catch {
    return [];
  }
};

const scanPeriodsFromFs = async (): Promise<PeriodId[]> => {
  const entries = await fs.readdir(DATA_ROOT, { withFileTypes: true }).catch(() => []);
  return sortPeriodsDesc(
    entries
      .filter((entry) => entry.isDirectory() && isPeriodId(entry.name))
      .map((entry) => entry.name as PeriodId)
  );
};

const readPeriodIndex = async (): Promise<PeriodIndex | null> => {
  const indexPath = path.join(DATA_ROOT, 'periods.generated.json');
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<PeriodIndex>;
    const periods = sortPeriodsDesc(
      (Array.isArray(parsed.periods) ? parsed.periods : []).filter(isPeriodId)
    );
    return {
      periods,
      latest: periods[0] || null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    };
  } catch {
    return null;
  }
};

export const loadAvailablePeriods = async (): Promise<PeriodId[]> => {
  const index = await readPeriodIndex();
  if (index && index.periods.length > 0) return index.periods;
  return scanPeriodsFromFs();
};

export const loadLatestPeriod = async (): Promise<PeriodId | null> => {
  const periods = await loadAvailablePeriods();
  return periods[0] || null;
};

export const loadCareers = async (period: PeriodId): Promise<CareerMeta[]> => {
  if (!isPeriodId(period)) return [];
  try {
    const raw = await fs.readFile(path.join(DATA_ROOT, period, 'careers.generated.json'), 'utf-8');
    return parseCareerMeta(raw);
  } catch {
    return [];
  }
};

export const loadLatestPeriodForCareer = async (careerSlug: string): Promise<PeriodId | null> => {
  const periods = await loadAvailablePeriods();
  for (const period of periods) {
    const careers = await loadCareers(period);
    if (careers.some((career) => career.slug === careerSlug)) return period;
  }
  return null;
};

export const loadSubjectsForCareer = async (
  period: PeriodId,
  careerSlug: string
): Promise<SubjectData[]> => {
  if (!isPeriodId(period)) return [];
  const subjectsDir = path.join(DATA_ROOT, period, careerSlug, 'materias');
  try {
    const files = (await fs.readdir(subjectsDir)).filter((file) => file.endsWith('.json'));
    const loaded = await Promise.all(
      files.map(async (file) => {
        const fullPath = path.join(subjectsDir, file);
        const raw = await fs.readFile(fullPath, 'utf-8');
        return JSON.parse(raw) as SubjectData;
      })
    );
    return loaded.sort((a, b) => catedraNumber(a) - catedraNumber(b));
  } catch {
    return [];
  }
};

export const resolvePreferredPeriod = async () => (await loadLatestPeriod()) || CURRENT_PERIOD;

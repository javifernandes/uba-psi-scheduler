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

const DATA_ROOT = path.join(process.cwd(), 'src/data/uba/psicologia/oferta');

const catedraNumber = (subject: SubjectData) =>
  Number.parseInt(subject.label.match(/Cátedra\s+(\d+)/i)?.[1] || '999999', 10);

export const loadCareers = async (period: PeriodId): Promise<CareerMeta[]> => {
  if (!isPeriodId(period)) return [];
  try {
    const raw = await fs.readFile(
      path.join(DATA_ROOT, period, 'careers.generated.json'),
      'utf-8'
    );
    const parsed = JSON.parse(raw) as CareerMeta[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const loadSubjectsForCareer = async (
  period: PeriodId,
  careerSlug: string
): Promise<SubjectData[]> => {
  if (!isPeriodId(period)) return [];
  const subjectsDir = path.join(DATA_ROOT, period, careerSlug, 'materias');
  try {
    const files = (await fs.readdir(subjectsDir)).filter(file => file.endsWith('.json'));
    const loaded = await Promise.all(
      files.map(async file => {
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

export const loadCurrentPeriodCareers = async () => loadCareers(CURRENT_PERIOD);

export const loadCurrentPeriodSubjectsForCareer = async (careerSlug: string) =>
  loadSubjectsForCareer(CURRENT_PERIOD, careerSlug);

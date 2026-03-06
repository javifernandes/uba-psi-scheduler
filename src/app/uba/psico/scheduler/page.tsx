import type { Metadata } from 'next';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PsicologiaScheduler, type SubjectData } from '../oferta/psicologia/psicologia-scheduler';

export const metadata: Metadata = {
  title: 'UBA Psicología - Scheduler',
  description: 'Comparador de horarios para materias y cátedras (UBA Psicología).',
};

const SUBJECTS_DIR = path.join(process.cwd(), 'src/app/uba/psico/oferta/psicologia/materias');

const catedraNumber = (subject: SubjectData) =>
  Number.parseInt(subject.label.match(/Cátedra\s+(\d+)/i)?.[1] || '999999', 10);

const loadSubjects = async (): Promise<SubjectData[]> => {
  try {
    const files = (await fs.readdir(SUBJECTS_DIR)).filter(file => file.endsWith('.json'));
    const loaded = await Promise.all(
      files.map(async file => {
        const fullPath = path.join(SUBJECTS_DIR, file);
        const raw = await fs.readFile(fullPath, 'utf-8');
        return JSON.parse(raw) as SubjectData;
      })
    );
    return loaded.sort((a, b) => catedraNumber(a) - catedraNumber(b));
  } catch {
    return [];
  }
};

const PsicoSchedulerPage = async () => {
  const subjects = await loadSubjects();
  return <PsicologiaScheduler subjects={subjects} />;
};

export default PsicoSchedulerPage;

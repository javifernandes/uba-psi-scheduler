import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PsicologiaScheduler } from '@/app/uba/psicologia/oferta/lic-psicologia/psicologia-scheduler';
import { loadCareers, loadSubjectsForCareer } from '@/lib/uba-careers';

type PageProps = {
  params: {
    career: string;
  };
};

export const metadata: Metadata = {
  title: 'UBA Psicología - Scheduler',
  description: 'Comparador de horarios para materias y cátedras (UBA Psicología).',
};

export const generateStaticParams = async () => {
  const careers = await loadCareers();
  return careers.map(career => ({ career: career.slug }));
};

const CareerSchedulerPage = async ({ params }: PageProps) => {
  const careers = await loadCareers();
  const career = careers.find(item => item.slug === params.career);
  if (!career) return notFound();

  const subjects = await loadSubjectsForCareer(career.slug);
  return (
    <PsicologiaScheduler
      subjects={subjects}
      careerLabel={career.label}
      careerSlug={career.slug}
      storageKey={`uba_psico_planner_v2:${career.slug}`}
    />
  );
};

export default CareerSchedulerPage;

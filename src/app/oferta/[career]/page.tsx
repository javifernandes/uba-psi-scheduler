import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Scheduler } from '@/components/scheduler/scheduler';
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

const CareerOfferPage = async ({ params }: PageProps) => {
  const careers = await loadCareers();
  const career = careers.find(item => item.slug === params.career);
  if (!career) return notFound();

  const subjects = await loadSubjectsForCareer(career.slug);
  return (
    <Scheduler
      subjects={subjects}
      careerLabel={career.label}
      careerSlug={career.slug}
      storageKey={`uba_psico_planner_v2:${career.slug}`}
    />
  );
};

export default CareerOfferPage;

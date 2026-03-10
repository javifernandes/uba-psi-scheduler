import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Scheduler } from '@/components/scheduler/scheduler';
import { loadCareers, loadSubjectsForCareer } from '@/lib/uba-careers';
import { isPeriodId } from '@/lib/period';
import { CURRENT_PERIOD } from '@/lib/current-period';

type PageProps = {
  params: {
    career: string;
    period: string;
  };
};

export const metadata: Metadata = {
  title: 'UBA Psicología - Scheduler',
  description: 'Comparador de horarios para materias y cátedras (UBA Psicología).',
};

export const generateStaticParams = async () => {
  const careers = await loadCareers(CURRENT_PERIOD);
  return careers.map(career => ({ career: career.slug, period: CURRENT_PERIOD }));
};

const CareerOfferPage = async ({ params }: PageProps) => {
  if (!isPeriodId(params.period)) return notFound();
  const careers = await loadCareers(params.period);
  const career = careers.find(item => item.slug === params.career);
  if (!career) return notFound();

  const subjects = await loadSubjectsForCareer(params.period, career.slug);
  return (
    <Scheduler
      subjects={subjects}
      careerLabel={career.label}
      careerSlug={career.slug}
      period={params.period}
    />
  );
};

export default CareerOfferPage;

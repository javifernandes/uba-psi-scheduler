import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { loadAvailablePeriods, loadCareers, loadLatestPeriodForCareer } from '@/lib/uba-careers';

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
  const periods = await loadAvailablePeriods();
  const allCareers = await Promise.all(periods.map((period) => loadCareers(period)));
  return Array.from(new Set(allCareers.flat().map((career) => career.slug))).map((career) => ({
    career,
  }));
};

const CareerOfferPage = async ({ params }: PageProps) => {
  const latestPeriod = await loadLatestPeriodForCareer(params.career);
  if (!latestPeriod) return notFound();
  redirect(`/oferta/${params.career}/${latestPeriod}`);
};

export default CareerOfferPage;

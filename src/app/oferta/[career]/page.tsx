import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { CURRENT_PERIOD } from '@/lib/current-period';
import { loadCareers } from '@/lib/uba-careers';

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
  const careers = await loadCareers(CURRENT_PERIOD);
  return careers.map(career => ({ career: career.slug }));
};

const CareerOfferPage = async ({ params }: PageProps) => {
  const careers = await loadCareers(CURRENT_PERIOD);
  const career = careers.find(item => item.slug === params.career);
  if (!career) return notFound();
  redirect(`/oferta/${career.slug}/${CURRENT_PERIOD}`);
};

export default CareerOfferPage;

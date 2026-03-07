import { redirect } from 'next/navigation';
import { loadCareers } from '@/lib/uba-careers';

type PageProps = {
  params: {
    career: string;
  };
};

export const generateStaticParams = async () => {
  const careers = await loadCareers();
  return careers.map(career => ({ career: career.slug }));
};

const CareerOfferPage = ({ params }: PageProps) => {
  redirect(`/uba/psicologia/oferta/${params.career}/scheduler`);
};

export default CareerOfferPage;

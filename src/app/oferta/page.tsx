import { Suspense } from 'react';
import { OfferPageClient } from '@/components/offer/OfferPageClient';

const OfferPage = () => (
  <Suspense fallback={null}>
    <OfferPageClient />
  </Suspense>
);

export default OfferPage;

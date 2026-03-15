import { Suspense } from 'react';
import { OfferAnalyticsPageClient } from '@/components/offer/OfferAnalyticsPageClient';

const OfferAnalyticsPage = () => (
  <Suspense fallback={null}>
    <OfferAnalyticsPageClient />
  </Suspense>
);

export default OfferAnalyticsPage;

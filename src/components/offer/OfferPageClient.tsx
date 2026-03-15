'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scheduler } from '@/components/scheduler/scheduler';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import {
  getOfferSubjects,
  listCareersWithLatestPeriod,
  listPeriodsByCareer,
  type CareerWithLatestPeriod,
} from '@/lib/offer-api';
import { normalizePeriod, type PeriodId } from '@/lib/period';

const LoadingState = ({ message }: { message: string }) => (
  <main className="min-h-dvh bg-[radial-gradient(circle_at_10%_10%,#f8dde7_0%,transparent_35%),radial-gradient(circle_at_90%_15%,#f6ebce_0%,transparent_28%),radial-gradient(circle_at_50%_100%,#f7e7f3_0%,transparent_35%),#faf5f7] px-5 py-10 dark:bg-[radial-gradient(circle_at_10%_10%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_90%_15%,#4f3e1f_0%,transparent_28%),radial-gradient(circle_at_50%_100%,#2a1e33_0%,transparent_35%),#0f0b12]">
    <section className="mx-auto max-w-4xl rounded-2xl border border-[#ead9e2] bg-white px-6 py-5 text-sm text-[#4f1237] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
      {message}
    </section>
  </main>
);

const ErrorState = ({ message }: { message: string }) => (
  <main className="min-h-dvh bg-[radial-gradient(circle_at_10%_10%,#f8dde7_0%,transparent_35%),radial-gradient(circle_at_90%_15%,#f6ebce_0%,transparent_28%),radial-gradient(circle_at_50%_100%,#f7e7f3_0%,transparent_35%),#faf5f7] px-5 py-10 dark:bg-[radial-gradient(circle_at_10%_10%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_90%_15%,#4f3e1f_0%,transparent_28%),radial-gradient(circle_at_50%_100%,#2a1e33_0%,transparent_35%),#0f0b12]">
    <section className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-100">
      {message}
    </section>
  </main>
);

const buildOfertaHref = (career: string, period: PeriodId) =>
  `/oferta?career=${encodeURIComponent(career)}&period=${encodeURIComponent(period)}`;

export const OfferPageClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [careers, setCareers] = useState<CareerWithLatestPeriod[]>([]);
  const [periods, setPeriods] = useState<PeriodId[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState<string>('');

  const queryCareer = searchParams.get('career') || '';
  const queryPeriod = normalizePeriod(searchParams.get('period') || '');

  useEffect(() => {
    let cancelled = false;
    setLoadingCatalog(true);
    setError('');
    listCareersWithLatestPeriod()
      .then((rows) => {
        if (cancelled) return;
        setCareers(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar carreras.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCareer = useMemo(() => {
    if (!careers.length) return '';
    if (queryCareer && careers.some((career) => career.slug === queryCareer)) return queryCareer;
    return careers[0]!.slug;
  }, [careers, queryCareer]);

  useEffect(() => {
    if (!selectedCareer) return;
    let cancelled = false;
    listPeriodsByCareer(selectedCareer)
      .then((rows) => {
        if (cancelled) return;
        setPeriods(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar períodos.');
        setPeriods([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCareer]);

  const selectedPeriod = useMemo(() => {
    if (!periods.length) return null;
    if (queryPeriod && periods.includes(queryPeriod)) return queryPeriod;
    const fallback = careers.find((career) => career.slug === selectedCareer)?.latestPeriod;
    if (fallback && periods.includes(fallback)) return fallback;
    return periods[0] || null;
  }, [careers, periods, queryPeriod, selectedCareer]);

  useEffect(() => {
    if (!selectedCareer || !selectedPeriod) return;
    if (queryCareer === selectedCareer && queryPeriod === selectedPeriod) return;
    router.replace(buildOfertaHref(selectedCareer, selectedPeriod), { scroll: false });
  }, [queryCareer, queryPeriod, router, selectedCareer, selectedPeriod]);

  useEffect(() => {
    if (!selectedCareer || !selectedPeriod) return;
    let cancelled = false;
    setLoadingSubjects(true);
    setError('');
    getOfferSubjects(selectedCareer, selectedPeriod)
      .then((rows) => {
        if (cancelled) return;
        setSubjects(rows);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar la oferta.');
        setSubjects([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingSubjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCareer, selectedPeriod]);

  if (loadingCatalog) return <LoadingState message="Cargando carreras y períodos..." />;
  if (error) return <ErrorState message={error} />;
  if (!careers.length) return <ErrorState message="No hay carreras disponibles en la API." />;
  if (!selectedPeriod) return <ErrorState message="No hay períodos disponibles para la carrera." />;
  if (loadingSubjects) return <LoadingState message="Cargando oferta..." />;

  const selectedCareerMeta =
    careers.find((career) => career.slug === selectedCareer) || careers[0]!;
  return (
    <Scheduler
      subjects={subjects}
      careerLabel={selectedCareerMeta.label}
      careerSlug={selectedCareerMeta.slug}
      period={selectedPeriod}
    />
  );
};

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getVacancyCapacity,
  getOfferSubjects,
  getVacancyAnalytics,
  getVacancyTrends,
  listCareersWithLatestPeriod,
  listPeriodsByCareer,
  type VacancyCapacityResponse,
  type CareerWithLatestPeriod,
  type VacancyAnalytics,
  type VacancyTrends,
} from '@/lib/offer-api';
import { normalizePeriod, type PeriodId } from '@/lib/period';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import {
  AnalyticsKpiGrid,
  AnalyticsSeriesTable,
  AnalyticsTopDropsTable,
  formatTimestamp,
} from '@/components/offer/OfferAnalyticsTables';
import { OfferAnalyticsCharts, OfferTopDropsChart } from '@/components/offer/OfferAnalyticsCharts';
import { OfferSubjectVacancyTable } from '@/components/offer/OfferSubjectVacancyTable';

const ANALYTICS_RANGES = [
  { value: '6h', label: '6h' },
  { value: '24h', label: '24h' },
  { value: '48h', label: '48h' },
  { value: '7d', label: '7d' },
  { value: 'all', label: 'Todo' },
] as const;

const buildOfferHref = (career: string, period: PeriodId) =>
  `/oferta?career=${encodeURIComponent(career)}&period=${encodeURIComponent(period)}`;

const buildAnalyticsHref = (career: string, period: PeriodId) =>
  `/oferta/analytics?career=${encodeURIComponent(career)}&period=${encodeURIComponent(period)}`;

const cyclePhaseLabel: Record<'before' | 'open' | 'closed' | 'unknown', string> = {
  before: 'Aún no abrió',
  open: 'Inscripción abierta',
  closed: 'Inscripción cerrada',
  unknown: 'Sin ventana definida',
};

const formatCycleDays = (value: number | null) => {
  if (typeof value !== 'number') return 's/d';
  return `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })} días`;
};

const parseIsoMs = (iso: string | null) => {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatWindowDateTime = (iso: string | null) => {
  const ms = parseIsoMs(iso);
  if (typeof ms !== 'number') return 's/d';
  return new Date(ms).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const formatCloseCountdown = (nowIso: string | null, endIso: string | null) => {
  const nowMs = parseIsoMs(nowIso);
  const endMs = parseIsoMs(endIso);
  if (typeof nowMs !== 'number' || typeof endMs !== 'number' || endMs <= nowMs) return null;
  const remainingMs = endMs - nowMs;
  const remainingHours = remainingMs / (60 * 60 * 1000);
  if (remainingHours >= 48) {
    return `${Math.ceil(remainingHours / 24)} días para cierre`;
  }
  if (remainingHours >= 1) {
    return `${Math.ceil(remainingHours)} hs para cierre`;
  }
  return `${Math.max(1, Math.ceil(remainingMs / (60 * 1000)))} min para cierre`;
};

const windowKindLabel = (kind: string) =>
  kind === 'supplementary' ? 'Inscripción suplementaria' : 'Inscripción principal';

export const OfferAnalyticsPageClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [careers, setCareers] = useState<CareerWithLatestPeriod[]>([]);
  const [periods, setPeriods] = useState<PeriodId[]>([]);
  const [range, setRange] = useState<(typeof ANALYTICS_RANGES)[number]['value']>('24h');
  const [analytics, setAnalytics] = useState<VacancyAnalytics | null>(null);
  const [trends, setTrends] = useState<VacancyTrends | null>(null);
  const [capacity, setCapacity] = useState<VacancyCapacityResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [error, setError] = useState('');
  const lastProbeAtRef = useRef<string | null>(null);

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
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCareer]);

  const selectedPeriod = useMemo(() => {
    if (!periods.length) return null;
    if (queryPeriod && periods.includes(queryPeriod)) return queryPeriod;
    const latest = careers.find((career) => career.slug === selectedCareer)?.latestPeriod;
    if (latest && periods.includes(latest)) return latest;
    return periods[0] || null;
  }, [careers, periods, queryPeriod, selectedCareer]);

  const enrollmentWindows = useMemo(() => analytics?.windows || [], [analytics?.windows]);
  const activeWindow = useMemo(
    () =>
      enrollmentWindows.find(
        (window) => window.windowId === analytics?.timeBounds.activeWindowId
      ) || null,
    [analytics?.timeBounds.activeWindowId, enrollmentWindows]
  );
  const closeCountdown = useMemo(
    () =>
      formatCloseCountdown(
        analytics?.timeBounds.nowAt || null,
        activeWindow ? activeWindow.endAt : analytics?.timeBounds.endAt || null
      ),
    [activeWindow, analytics?.timeBounds.endAt, analytics?.timeBounds.nowAt]
  );

  useEffect(() => {
    if (!selectedCareer || !selectedPeriod) return;
    if (queryCareer === selectedCareer && queryPeriod === selectedPeriod) return;
    router.replace(buildAnalyticsHref(selectedCareer, selectedPeriod), { scroll: false });
  }, [queryCareer, queryPeriod, router, selectedCareer, selectedPeriod]);

  useEffect(() => {
    if (!selectedCareer || !selectedPeriod) return;
    let cancelled = false;
    setLoadingAnalytics(true);
    setLoadingSubjects(true);
    setError('');
    Promise.all([
      getVacancyAnalytics(selectedCareer, selectedPeriod, range),
      getOfferSubjects(selectedCareer, selectedPeriod),
      getVacancyTrends(selectedCareer, selectedPeriod, range),
      getVacancyCapacity(selectedCareer, selectedPeriod, true),
    ])
      .then(([analyticsPayload, subjectsPayload, trendsPayload, capacityPayload]) => {
        if (cancelled) return;
        setAnalytics(analyticsPayload);
        setSubjects(subjectsPayload);
        setTrends(trendsPayload);
        setCapacity(capacityPayload);
        lastProbeAtRef.current = analyticsPayload.lastProbeAt || null;
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar analíticas.');
        setAnalytics(null);
        setSubjects([]);
        setTrends(null);
        setCapacity(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingAnalytics(false);
        setLoadingSubjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCareer, selectedPeriod, range]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!selectedCareer || !selectedPeriod) return;
      getVacancyAnalytics(selectedCareer, selectedPeriod, range)
        .then(async (analyticsPayload) => {
          setAnalytics(analyticsPayload);
          const nextProbeAt = analyticsPayload.lastProbeAt || null;
          if (nextProbeAt && nextProbeAt === lastProbeAtRef.current) return;

          const [subjectsPayload, trendsPayload, capacityPayload] = await Promise.all([
            getOfferSubjects(selectedCareer, selectedPeriod),
            getVacancyTrends(selectedCareer, selectedPeriod, range),
            getVacancyCapacity(selectedCareer, selectedPeriod, true),
          ]);
          setSubjects(subjectsPayload);
          setTrends(trendsPayload);
          setCapacity(capacityPayload);
          lastProbeAtRef.current = nextProbeAt;
        })
        .catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [range, selectedCareer, selectedPeriod]);

  if (loadingCatalog) {
    return (
      <main className="min-h-dvh bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#f9edf4_0%,transparent_35%),#f8f2f5] px-3 py-4">
        <section className="mx-auto w-full max-w-[1400px] rounded-2xl border border-[#ead9e2] bg-white p-6 text-[#4f1237]">
          Cargando analíticas...
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-dvh bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#f9edf4_0%,transparent_35%),#f8f2f5] px-3 py-4">
        <section className="mx-auto w-full max-w-[1400px] rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900">
          {error}
        </section>
      </main>
    );
  }

  if (!selectedCareer || !selectedPeriod) {
    return (
      <main className="min-h-dvh bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#f9edf4_0%,transparent_35%),#f8f2f5] px-3 py-4">
        <section className="mx-auto w-full max-w-[1400px] rounded-2xl border border-[#ead9e2] bg-white p-6 text-[#4f1237]">
          No hay carrera/período disponible.
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#f9edf4_0%,transparent_35%),#f8f2f5] px-3 py-4 dark:bg-[radial-gradient(circle_at_0%_0%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#231725_0%,transparent_35%),#0f0b12] md:px-5">
      <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-3">
        <div className="rounded-2xl bg-[#861f5c] px-4 py-3 text-white">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-bold md:text-xl">Analíticas de Vacantes</h1>
            <div className="flex items-center gap-2 text-xs">
              <Link
                href={buildOfferHref(selectedCareer, selectedPeriod)}
                className="rounded-md border border-white/25 bg-white/10 px-2 py-1 font-semibold hover:bg-white/15"
              >
                Horarios
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ANALYTICS_RANGES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setRange(entry.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                range === entry.value
                  ? 'bg-[#861f5c] text-white'
                  : 'border border-[#dbc7d3] bg-white text-[#5a1740]'
              }`}
            >
              {entry.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-[#6f3b58]">
            Última captura: {formatTimestamp(analytics?.lastProbeAt || null)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6f3b58]">
          <span className="rounded-md border border-[#dbc7d3] bg-white px-2 py-1 font-semibold">
            {cyclePhaseLabel[analytics?.timeBounds.phase || 'unknown']}
          </span>
          <span className="rounded-md border border-[#dbc7d3] bg-white px-2 py-1 font-semibold">
            Restan: {formatCycleDays(analytics?.timeBounds.daysRemaining ?? null)}
          </span>
          {closeCountdown ? (
            <span className="rounded-md border border-[#dbc7d3] bg-white px-2 py-1 font-semibold">
              {closeCountdown}
            </span>
          ) : null}
          {enrollmentWindows.map((window) => (
            <span
              key={window.windowId}
              className="rounded-md border border-[#dbc7d3] bg-white px-2 py-1 font-semibold"
            >
              {windowKindLabel(window.kind)}: {formatWindowDateTime(window.startAt)} →{' '}
              {formatWindowDateTime(window.endAt)}
            </span>
          ))}
        </div>

        {loadingAnalytics && (
          <div className="rounded-xl border border-[#ead9e2] bg-white px-4 py-3 text-sm text-[#4f1237]">
            Actualizando analíticas...
          </div>
        )}

        <AnalyticsKpiGrid analytics={analytics} />
        <OfferAnalyticsCharts analytics={analytics} />
        <OfferSubjectVacancyTable
          subjects={subjects}
          trends={trends}
          capacity={capacity}
          loading={loadingSubjects}
        />
        <AnalyticsSeriesTable series={analytics?.series || []} />
        <section className="grid gap-3 xl:grid-cols-2">
          <OfferTopDropsChart analytics={analytics} />
          <AnalyticsTopDropsTable topDrops={analytics?.topDrops || []} />
        </section>
      </section>
    </main>
  );
};

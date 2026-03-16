'use client';

import { useMemo, useState } from 'react';
import type { VacancyAnalytics } from '@/lib/offer-api';

type VacancyAnalyticsPoint = VacancyAnalytics['series'][number];
type VacancyDropItem = VacancyAnalytics['topDrops'][number];
type SortDirection = 'asc' | 'desc';
type AnalyticsSeriesRow = VacancyAnalyticsPoint & {
  deltaKnownVacancies: number | null;
};

export const formatTimestamp = (iso: string | null) => {
  if (!iso) return 's/d';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 's/d';
  return `${date.toLocaleDateString('es-AR')} ${date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

const nextDirection = (current: SortDirection, active: boolean): SortDirection =>
  !active ? 'desc' : current === 'desc' ? 'asc' : 'desc';

const headerButtonClass =
  'inline-flex items-center gap-1 font-semibold text-[#7b4a65] hover:text-[#4f1237]';

const sortIndicator = (active: boolean, direction: SortDirection) => {
  if (!active) return '↕';
  return direction === 'desc' ? '↓' : '↑';
};

export const AnalyticsKpiGrid = ({ analytics }: { analytics: VacancyAnalytics | null }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
    <article className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <p className="text-xs text-[#7b4a65]">Vacantes conocidas</p>
      <p className="mt-1 text-2xl font-black text-[#4f1237]">
        {analytics?.totals.knownVacancies ?? 0}
      </p>
    </article>
    <article className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <p className="text-xs text-[#7b4a65]">Sin cupo</p>
      <p className="mt-1 text-2xl font-black text-[#4f1237]">{analytics?.totals.sinCupo ?? 0}</p>
    </article>
    <article className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <p className="text-xs text-[#7b4a65]">Cupo bajo</p>
      <p className="mt-1 text-2xl font-black text-[#4f1237]">{analytics?.totals.cupoBajo ?? 0}</p>
    </article>
    <article className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <p className="text-xs text-[#7b4a65]">Cupo disponible</p>
      <p className="mt-1 text-2xl font-black text-[#4f1237]">
        {analytics?.totals.cupoDisponible ?? 0}
      </p>
    </article>
    <article className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <p className="text-xs text-[#7b4a65]">Sin datos</p>
      <p className="mt-1 text-2xl font-black text-[#4f1237]">{analytics?.totals.sinDatos ?? 0}</p>
    </article>
  </div>
);

export const AnalyticsSeriesTable = ({ series }: { series: VacancyAnalyticsPoint[] }) => {
  const [sortKey, setSortKey] = useState<keyof AnalyticsSeriesRow>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const seriesWithDelta = useMemo<AnalyticsSeriesRow[]>(() => {
    const rows = [...series].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    return rows.map((row, index) => {
      const previous = rows[index - 1];
      return {
        ...row,
        deltaKnownVacancies: previous ? row.knownVacancies - previous.knownVacancies : null,
      };
    });
  }, [series]);

  const sortedSeries = useMemo(() => {
    const rows = [...seriesWithDelta];
    rows.sort((a, b) => {
      const direction = sortDirection === 'desc' ? -1 : 1;
      if (sortKey === 'timestamp') {
        return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * direction;
      }
      if (sortKey === 'deltaKnownVacancies') {
        const aValue = a.deltaKnownVacancies ?? Number.NEGATIVE_INFINITY;
        const bValue = b.deltaKnownVacancies ?? Number.NEGATIVE_INFINITY;
        return (aValue - bValue) * direction;
      }
      return (a[sortKey] - b[sortKey]) * direction;
    });
    return rows;
  }, [seriesWithDelta, sortDirection, sortKey]);

  const applySort = (nextKey: keyof AnalyticsSeriesRow) => {
    const active = sortKey === nextKey;
    setSortDirection(nextDirection(sortDirection, active));
    setSortKey(nextKey);
  };

  return (
    <section className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <h2 className="text-sm font-bold text-[#4f1237]">Serie temporal (resumen)</h2>
      <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-[#ead9e2]">
        <table className="w-full border-collapse text-xs">
          <thead className="text-left text-[#7b4a65]">
            <tr>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('timestamp')}
                >
                  Timestamp {sortIndicator(sortKey === 'timestamp', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('knownVacancies')}
                >
                  Vacantes {sortIndicator(sortKey === 'knownVacancies', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('deltaKnownVacancies')}
                >
                  Δ vacantes {sortIndicator(sortKey === 'deltaKnownVacancies', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('sinCupo')}
                >
                  Sin cupo {sortIndicator(sortKey === 'sinCupo', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('cupoBajo')}
                >
                  Cupo bajo {sortIndicator(sortKey === 'cupoBajo', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('cupoDisponible')}
                >
                  Disponible {sortIndicator(sortKey === 'cupoDisponible', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('sinDatos')}
                >
                  Sin datos {sortIndicator(sortKey === 'sinDatos', sortDirection)}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSeries.map((point) => (
              <tr key={point.timestamp} className="border-t border-[#f0e4eb] text-[#4f1237]">
                <td className="px-3 py-2">{formatTimestamp(point.timestamp)}</td>
                <td className="px-3 py-2">{point.knownVacancies}</td>
                <td
                  className={`px-3 py-2 font-semibold ${
                    point.deltaKnownVacancies === null
                      ? 'text-[#7b4a65]'
                      : point.deltaKnownVacancies > 0
                        ? 'text-emerald-700'
                        : point.deltaKnownVacancies < 0
                          ? 'text-red-700'
                          : 'text-[#4f1237]'
                  }`}
                >
                  {point.deltaKnownVacancies === null
                    ? '—'
                    : point.deltaKnownVacancies > 0
                      ? `+${point.deltaKnownVacancies}`
                      : String(point.deltaKnownVacancies)}
                </td>
                <td className="px-3 py-2">{point.sinCupo}</td>
                <td className="px-3 py-2">{point.cupoBajo}</td>
                <td className="px-3 py-2">{point.cupoDisponible}</td>
                <td className="px-3 py-2">{point.sinDatos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export const AnalyticsTopDropsTable = ({ topDrops }: { topDrops: VacancyDropItem[] }) => {
  const [sortKey, setSortKey] = useState<keyof VacancyDropItem>('delta');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedDrops = useMemo(() => {
    const rows = [...topDrops];
    const direction = sortDirection === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      if (sortKey === 'subjectLabel' || sortKey === 'commissionId' || sortKey === 'key') {
        return a[sortKey].localeCompare(b[sortKey]) * direction;
      }
      if (sortKey === 'capturedAt') {
        return (new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()) * direction;
      }
      if (sortKey === 'delta') {
        return (a.delta - b.delta) * direction;
      }
      const aVacantes = a.vacantes ?? Number.NEGATIVE_INFINITY;
      const bVacantes = b.vacantes ?? Number.NEGATIVE_INFINITY;
      return (aVacantes - bVacantes) * direction;
    });
    return rows;
  }, [sortDirection, sortKey, topDrops]);

  const applySort = (nextKey: keyof VacancyDropItem) => {
    const active = sortKey === nextKey;
    setSortDirection(nextDirection(sortDirection, active));
    setSortKey(nextKey);
  };

  return (
    <section className="rounded-xl border border-[#ead9e2] bg-white p-4">
      <h2 className="text-sm font-bold text-[#4f1237]">Top caídas de vacantes</h2>
      <div className="mt-3 max-h-[320px] overflow-auto rounded-lg border border-[#ead9e2]">
        <table className="w-full border-collapse text-xs">
          <thead className="text-left text-[#7b4a65]">
            <tr>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('subjectLabel')}
                >
                  Materia/Cátedra {sortIndicator(sortKey === 'subjectLabel', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('commissionId')}
                >
                  Comisión {sortIndicator(sortKey === 'commissionId', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('delta')}
                >
                  Delta {sortIndicator(sortKey === 'delta', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('vacantes')}
                >
                  Vacantes actuales {sortIndicator(sortKey === 'vacantes', sortDirection)}
                </button>
              </th>
              <th className="sticky top-0 z-10 bg-[#faf1f6] px-3 py-2">
                <button
                  type="button"
                  className={headerButtonClass}
                  onClick={() => applySort('capturedAt')}
                >
                  Captura {sortIndicator(sortKey === 'capturedAt', sortDirection)}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedDrops.map((item) => (
              <tr
                key={`${item.key}-${item.capturedAt}`}
                className="border-t border-[#f0e4eb] text-[#4f1237]"
              >
                <td className="px-3 py-2">{item.subjectLabel}</td>
                <td className="px-3 py-2">{item.commissionId}</td>
                <td className="px-3 py-2 font-bold text-red-700">{item.delta}</td>
                <td className="px-3 py-2">{item.vacantes ?? 's/d'}</td>
                <td className="px-3 py-2">{formatTimestamp(item.capturedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

import type { VacancyAnalytics } from '@/lib/offer-api';

type VacancyAnalyticsPoint = VacancyAnalytics['series'][number];
type VacancyDropItem = VacancyAnalytics['topDrops'][number];

export const formatTimestamp = (iso: string | null) => {
  if (!iso) return 's/d';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 's/d';
  return `${date.toLocaleDateString('es-AR')} ${date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
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

export const AnalyticsSeriesTable = ({ series }: { series: VacancyAnalyticsPoint[] }) => (
  <section className="rounded-xl border border-[#ead9e2] bg-white p-4">
    <h2 className="text-sm font-bold text-[#4f1237]">Serie temporal (resumen)</h2>
    <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-[#ead9e2]">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-[#faf1f6] text-left text-[#7b4a65]">
          <tr>
            <th className="px-3 py-2 font-semibold">Timestamp</th>
            <th className="px-3 py-2 font-semibold">Vacantes</th>
            <th className="px-3 py-2 font-semibold">Sin cupo</th>
            <th className="px-3 py-2 font-semibold">Cupo bajo</th>
            <th className="px-3 py-2 font-semibold">Disponible</th>
            <th className="px-3 py-2 font-semibold">Sin datos</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.timestamp} className="border-t border-[#f0e4eb] text-[#4f1237]">
              <td className="px-3 py-2">{formatTimestamp(point.timestamp)}</td>
              <td className="px-3 py-2">{point.knownVacancies}</td>
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

export const AnalyticsTopDropsTable = ({ topDrops }: { topDrops: VacancyDropItem[] }) => (
  <section className="rounded-xl border border-[#ead9e2] bg-white p-4">
    <h2 className="text-sm font-bold text-[#4f1237]">Top caídas de vacantes</h2>
    <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-[#ead9e2]">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-[#faf1f6] text-left text-[#7b4a65]">
          <tr>
            <th className="px-3 py-2 font-semibold">Materia/Cátedra</th>
            <th className="px-3 py-2 font-semibold">Comisión</th>
            <th className="px-3 py-2 font-semibold">Delta</th>
            <th className="px-3 py-2 font-semibold">Vacantes actuales</th>
            <th className="px-3 py-2 font-semibold">Captura</th>
          </tr>
        </thead>
        <tbody>
          {topDrops.map((item) => (
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

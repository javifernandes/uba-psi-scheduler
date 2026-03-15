'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { VacancyAnalytics } from '@/lib/offer-api';
import { formatTimestamp } from '@/components/offer/OfferAnalyticsTables';

const ReactECharts = dynamic(async () => (await import('echarts-for-react')).default, {
  ssr: false,
});

const trimLabel = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const parseIsoMs = (iso: string | null) => {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : null;
};

const axisLabelFormatter = (value: number) =>
  new Date(value).toLocaleDateString('es-AR', { month: '2-digit', day: '2-digit' });

const tooltipDateTime = (value: number) =>
  new Date(value).toLocaleString('es-AR', { hour12: false });

type OfferAnalyticsChartsProps = {
  analytics: VacancyAnalytics | null;
};

type MarkAreaRange = [
  {
    name: string;
    xAxis: number;
    itemStyle: {
      color: string;
    };
  },
  {
    xAxis: number;
  },
];

export const OfferAnalyticsCharts = ({ analytics }: OfferAnalyticsChartsProps) => {
  const points = useMemo(() => analytics?.series || [], [analytics]);
  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [points]
  );
  const knownVacanciesData = useMemo(
    () =>
      sortedPoints
        .map((point) => {
          const time = parseIsoMs(point.timestamp);
          return typeof time === 'number' ? [time, point.knownVacancies] : null;
        })
        .filter((item): item is [number, number] => Array.isArray(item)),
    [sortedPoints]
  );
  const statusData = useMemo(
    () => ({
      sinCupo: sortedPoints
        .map((point) => {
          const time = parseIsoMs(point.timestamp);
          return typeof time === 'number' ? [time, point.sinCupo] : null;
        })
        .filter((item): item is [number, number] => Array.isArray(item)),
      cupoBajo: sortedPoints
        .map((point) => {
          const time = parseIsoMs(point.timestamp);
          return typeof time === 'number' ? [time, point.cupoBajo] : null;
        })
        .filter((item): item is [number, number] => Array.isArray(item)),
      cupoDisponible: sortedPoints
        .map((point) => {
          const time = parseIsoMs(point.timestamp);
          return typeof time === 'number' ? [time, point.cupoDisponible] : null;
        })
        .filter((item): item is [number, number] => Array.isArray(item)),
      sinDatos: sortedPoints
        .map((point) => {
          const time = parseIsoMs(point.timestamp);
          return typeof time === 'number' ? [time, point.sinDatos] : null;
        })
        .filter((item): item is [number, number] => Array.isArray(item)),
    }),
    [sortedPoints]
  );

  const timeBounds = analytics?.timeBounds || null;
  const cycleStartMs = parseIsoMs(timeBounds?.startAt || null);
  const cycleEndMs = parseIsoMs(timeBounds?.endAt || null);
  const nowMs = parseIsoMs(timeBounds?.nowAt || null) || Date.now();
  const dataMinMs = knownVacanciesData.length ? knownVacanciesData[0]![0] : null;
  const dataMaxMs = knownVacanciesData.length
    ? knownVacanciesData[knownVacanciesData.length - 1]![0]
    : null;
  const xMin = cycleStartMs ?? dataMinMs;
  const xMax = cycleEndMs ?? dataMaxMs;
  const hasXAxisBounds = typeof xMin === 'number' && typeof xMax === 'number';
  const futureWindowAreas = useMemo(
    () =>
      (analytics?.windows || [])
        .filter((window) => window.enabled)
        .map((window) => {
          const startMs = parseIsoMs(window.startAt);
          const endMs = parseIsoMs(window.endAt);
          if (typeof startMs !== 'number' || typeof endMs !== 'number') return null;
          if (endMs <= nowMs) return null;

          let segmentStart = Math.max(startMs, nowMs);
          let segmentEnd = endMs;
          if (typeof xMin === 'number') segmentStart = Math.max(segmentStart, xMin);
          if (typeof xMax === 'number') segmentEnd = Math.min(segmentEnd, xMax);
          if (segmentEnd <= segmentStart) return null;

          return {
            label: window.label,
            kind: window.kind,
            segmentStart,
            segmentEnd,
          };
        })
        .filter(
          (
            area
          ): area is { label: string; kind: string; segmentStart: number; segmentEnd: number } =>
            Boolean(area)
        ),
    [analytics?.windows, nowMs, xMax, xMin]
  );

  const markAreaData = useMemo<MarkAreaRange[]>(
    () =>
      futureWindowAreas.map((area) => [
        {
          name: area.label,
          xAxis: area.segmentStart,
          itemStyle: {
            color:
              area.kind === 'supplementary'
                ? 'rgba(92, 113, 149, 0.12)'
                : 'rgba(123, 74, 101, 0.10)',
          },
        },
        { xAxis: area.segmentEnd },
      ]),
    [futureWindowAreas]
  );

  const knownVacanciesOption = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { top: 22, left: 52, right: 18, bottom: 52 },
      xAxis: {
        type: 'time',
        min: xMin ?? undefined,
        max: xMax ?? undefined,
        axisLabel: {
          color: '#6f3b58',
          fontSize: 11,
          formatter: (value: number) => axisLabelFormatter(value),
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#6f3b58', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1e5ed' } },
      },
      series: [
        {
          name: 'Vacantes',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: knownVacanciesData,
          lineStyle: { width: 3, color: '#861f5c' },
          areaStyle: { color: 'rgba(134, 31, 92, 0.14)' },
          markLine: hasXAxisBounds
            ? {
                silent: true,
                symbol: 'none',
                lineStyle: { color: '#7b4a65', type: 'dashed' },
                label: {
                  formatter: `Ahora\n${tooltipDateTime(nowMs)}`,
                  color: '#7b4a65',
                },
                data: [{ xAxis: nowMs }],
              }
            : undefined,
          markArea: markAreaData.length
            ? {
                silent: true,
                data: markAreaData,
              }
            : undefined,
        },
      ],
    }),
    [knownVacanciesData, nowMs, xMax, xMin, hasXAxisBounds, markAreaData]
  );

  const statusStackedOption = useMemo<EChartsOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: {
        top: 0,
        textStyle: { color: '#6f3b58', fontSize: 11 },
      },
      grid: { top: 36, left: 52, right: 18, bottom: 52 },
      xAxis: {
        type: 'time',
        min: xMin ?? undefined,
        max: xMax ?? undefined,
        axisLabel: {
          color: '#6f3b58',
          fontSize: 11,
          formatter: (value: number) => axisLabelFormatter(value),
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#6f3b58', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1e5ed' } },
      },
      series: [
        {
          name: 'Sin cupo',
          type: 'line',
          stack: 'estado',
          smooth: true,
          showSymbol: false,
          data: statusData.sinCupo,
          lineStyle: { color: '#d04870' },
          areaStyle: { color: 'rgba(208, 72, 112, 0.16)' },
          markArea: markAreaData.length
            ? {
                silent: true,
                data: markAreaData,
              }
            : undefined,
        },
        {
          name: 'Cupo bajo',
          type: 'line',
          stack: 'estado',
          smooth: true,
          showSymbol: false,
          data: statusData.cupoBajo,
          lineStyle: { color: '#cf8d00' },
          areaStyle: { color: 'rgba(207, 141, 0, 0.18)' },
        },
        {
          name: 'Disponible',
          type: 'line',
          stack: 'estado',
          smooth: true,
          showSymbol: false,
          data: statusData.cupoDisponible,
          lineStyle: { color: '#2f9b65' },
          areaStyle: { color: 'rgba(47, 155, 101, 0.16)' },
        },
        {
          name: 'Sin datos',
          type: 'line',
          stack: 'estado',
          smooth: true,
          showSymbol: false,
          data: statusData.sinDatos,
          lineStyle: { color: '#8c7a8a' },
          areaStyle: { color: 'rgba(140, 122, 138, 0.16)' },
        },
      ],
    }),
    [statusData, xMax, xMin, markAreaData]
  );

  const topDrops = useMemo(
    () =>
      (analytics?.topDrops || []).slice(0, 10).map((item) => ({
        label: trimLabel(`${item.commissionId} · ${item.subjectLabel}`, 52),
        drop: Math.abs(item.delta),
      })),
    [analytics]
  );

  const topDropsOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      grid: { top: 16, left: 230, right: 18, bottom: 16, containLabel: false },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#6f3b58', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f1e5ed' } },
      },
      yAxis: {
        type: 'category',
        data: topDrops.map((item) => item.label),
        axisLabel: { color: '#6f3b58', fontSize: 11, width: 220, overflow: 'truncate' },
      },
      series: [
        {
          name: 'Caída',
          type: 'bar',
          data: topDrops.map((item) => item.drop),
          barWidth: 14,
          itemStyle: { color: '#d04870', borderRadius: [0, 6, 6, 0] },
        },
      ],
    }),
    [topDrops]
  );

  if (!points.length && !hasXAxisBounds) {
    return (
      <section className="rounded-xl border border-[#ead9e2] bg-white p-4 text-sm text-[#4f1237]">
        Todavía no hay suficiente histórico para graficar.
      </section>
    );
  }

  return (
    <section className="grid gap-3 xl:grid-cols-2">
      <article className="rounded-xl border border-[#ead9e2] bg-white p-4">
        <h2 className="text-sm font-bold text-[#4f1237]">Evolución de vacantes totales</h2>
        <ReactECharts option={knownVacanciesOption} style={{ height: 280 }} />
        <p className="mt-2 text-xs text-[#6f3b58]">
          Franjas sombreadas: ventanas futuras de inscripción (principal y suplementaria).
        </p>
      </article>

      <article className="rounded-xl border border-[#ead9e2] bg-white p-4">
        <h2 className="text-sm font-bold text-[#4f1237]">Estado del cupo en el tiempo</h2>
        <ReactECharts option={statusStackedOption} style={{ height: 280 }} />
      </article>

      <article className="rounded-xl border border-[#ead9e2] bg-white p-4 xl:col-span-2">
        <h2 className="text-sm font-bold text-[#4f1237]">Top caídas de vacantes</h2>
        {topDrops.length ? (
          <ReactECharts option={topDropsOption} style={{ height: 320 }} />
        ) : (
          <p className="mt-3 text-sm text-[#6f3b58]">
            No hay caídas registradas en el rango elegido.
          </p>
        )}
      </article>
    </section>
  );
};

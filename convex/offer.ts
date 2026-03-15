import { query } from './_generated/server';
import { v } from 'convex/values';
import {
  parseIsoMs,
  resolveTimeBounds,
  windowsForCareer,
  type EnrollmentWindowRecord,
} from './windows';

const vacancyStatus = (vacantes: number | null) => {
  if (vacantes === null) return 'sin_datos';
  if (vacantes === 0) return 'sin_cupo';
  if (vacantes <= 10) return 'cupo_bajo';
  return 'cupo_disponible';
};

const rangeStart = (range: string, nowMs: number) => {
  if (range === '6h') return new Date(nowMs - 6 * 60 * 60 * 1000).toISOString();
  if (range === '24h') return new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  if (range === '48h') return new Date(nowMs - 48 * 60 * 60 * 1000).toISOString();
  if (range === '7d') return new Date(nowMs - 7 * 24 * 60 * 60 * 1000).toISOString();
  return '';
};

const materiaIdFromLabel = (subjectLabel: string, fallbackSubjectId: string) =>
  subjectLabel.match(/^\((\d+)\)/)?.[1] || fallbackSubjectId;

const vacancyNumber = (value: number | null) => (typeof value === 'number' ? value : 0);

type TrendPoint = { t: number; v: number };

const downsampleTrend = (points: TrendPoint[], maxPoints: number) => {
  if (points.length <= maxPoints) return points;
  const sampled: TrendPoint[] = [];
  const steps = maxPoints - 1;
  for (let i = 0; i <= steps; i += 1) {
    const index = Math.round((i * (points.length - 1)) / steps);
    const point = points[index];
    if (point) sampled.push(point);
  }
  return sampled;
};

const upsertTrendPoint = (
  byEntity: Map<string, TrendPoint[]>,
  entityId: string,
  timestampMs: number,
  value: number
) => {
  const rows = byEntity.get(entityId) || [];
  const last = rows[rows.length - 1];
  if (!last || last.t !== timestampMs || last.v !== value) {
    rows.push({ t: timestampMs, v: value });
    byEntity.set(entityId, rows);
  }
};

export const listCareersWithLatestPeriod = query({
  args: {},
  handler: async (ctx) => {
    const subjects = await ctx.db.query('offerSubjects').collect();
    const byCareer = new Map<
      string,
      { slug: string; label: string; latestPeriod: string; subjects: number }
    >();

    subjects.forEach((item) => {
      const prev = byCareer.get(item.careerSlug);
      if (!prev) {
        byCareer.set(item.careerSlug, {
          slug: item.careerSlug,
          label: item.careerLabel,
          latestPeriod: item.period,
          subjects: 1,
        });
        return;
      }
      if (item.period > prev.latestPeriod) prev.latestPeriod = item.period;
      if (item.period === prev.latestPeriod) prev.subjects += 1;
    });

    return Array.from(byCareer.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  },
});

export const listPeriodsByCareer = query({
  args: {
    careerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('offerSubjects')
      .withIndex('by_career_period', (q) => q.eq('careerSlug', args.careerSlug))
      .collect();
    return Array.from(new Set(rows.map((row) => row.period))).sort((a, b) =>
      b.localeCompare(a, 'en')
    );
  },
});

export const getOfferSubjects = query({
  args: {
    careerSlug: v.string(),
    period: v.string(),
  },
  handler: async (ctx, args) => {
    const [subjects, vacancies] = await Promise.all([
      ctx.db
        .query('offerSubjects')
        .withIndex('by_career_period', (q) =>
          q.eq('careerSlug', args.careerSlug).eq('period', args.period)
        )
        .collect(),
      ctx.db
        .query('vacancyCurrent')
        .withIndex('by_career_period', (q) =>
          q.eq('careerSlug', args.careerSlug).eq('period', args.period)
        )
        .collect(),
    ]);

    const byKey = new Map<string, number | null>();
    vacancies.forEach((item) => byKey.set(`${item.subjectId}|${item.commissionId}`, item.vacantes));

    return subjects
      .map((subject) => ({
        schemaVersion: 2,
        id: subject.subjectId,
        label: subject.label,
        header: subject.header,
        slots: subject.slots.map((slot: any) => {
          if (slot.tipo !== 'prac') return slot;
          const current = byKey.get(`${subject.subjectId}|${slot.id}`);
          if (typeof current === 'undefined') return slot;
          return {
            ...slot,
            vacantes: current,
          };
        }),
      }))
      .sort((a, b) => {
        const nA = Number.parseInt(a.label.match(/Cátedra\s+(\d+)/i)?.[1] || '999999', 10);
        const nB = Number.parseInt(b.label.match(/Cátedra\s+(\d+)/i)?.[1] || '999999', 10);
        return nA - nB;
      });
  },
});

export const getVacancyAnalytics = query({
  args: {
    careerSlug: v.string(),
    period: v.string(),
    range: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const [runs, changes, allWindows] = await Promise.all([
      ctx.db
        .query('vacancyProbeRuns')
        .withIndex('by_career_period_capturedAt', (q) =>
          q.eq('careerSlug', args.careerSlug).eq('period', args.period)
        )
        .collect(),
      ctx.db
        .query('vacancyChanges')
        .withIndex('by_career_period_capturedAt', (q) =>
          q.eq('careerSlug', args.careerSlug).eq('period', args.period)
        )
        .collect(),
      ctx.db
        .query('enrollmentWindows')
        .withIndex('by_period', (q) => q.eq('period', args.period))
        .collect(),
    ]);

    const windows = windowsForCareer(allWindows as EnrollmentWindowRecord[], args.careerSlug);
    const sortedWindows = [...windows].sort((a, b) => a.startAt.localeCompare(b.startAt));
    const timeBounds = resolveTimeBounds(windows, now);
    const cycleStartMs = timeBounds.startAt ? parseIsoMs(timeBounds.startAt) : null;
    const cycleEndMs = timeBounds.endAt ? parseIsoMs(timeBounds.endAt) : null;
    const rangeStartMs = parseIsoMs(rangeStart(args.range, now));
    const effectiveStartMs =
      typeof rangeStartMs === 'number' && typeof cycleStartMs === 'number'
        ? Math.max(rangeStartMs, cycleStartMs)
        : typeof rangeStartMs === 'number'
          ? rangeStartMs
          : cycleStartMs;

    const inRange = (capturedAt: string) => {
      const capturedAtMs = parseIsoMs(capturedAt);
      if (typeof capturedAtMs !== 'number') return false;
      if (typeof effectiveStartMs === 'number' && capturedAtMs < effectiveStartMs) return false;
      if (typeof cycleEndMs === 'number' && capturedAtMs > cycleEndMs) return false;
      return true;
    };

    const filteredRuns = runs.filter((item) => inRange(item.capturedAt));
    const filteredChanges = changes.filter((item) => inRange(item.capturedAt));

    const totals = filteredRuns.length
      ? filteredRuns[filteredRuns.length - 1]!.totals
      : {
          knownVacancies: 0,
          sinCupo: 0,
          cupoBajo: 0,
          cupoDisponible: 0,
          sinDatos: 0,
          totalCommissions: 0,
        };

    const topDrops = filteredChanges
      .filter((item) => typeof item.delta === 'number' && item.delta < 0)
      .sort((a, b) => (a.delta as number) - (b.delta as number))
      .slice(0, 30)
      .map((item) => ({
        key: item.key,
        subjectId: item.subjectId,
        subjectLabel: item.subjectLabel,
        commissionId: item.commissionId,
        delta: item.delta as number,
        vacantes: item.vacantes,
        capturedAt: item.capturedAt,
        status: vacancyStatus(item.vacantes),
      }));

    return {
      lastProbeAt: filteredRuns.length ? filteredRuns[filteredRuns.length - 1]!.capturedAt : null,
      totals,
      windows: sortedWindows.map((window) => ({
        windowId: window.windowId,
        label: window.label,
        startAt: window.startAt,
        endAt: window.endAt,
        kind: window.kind,
        enabled: window.enabled,
      })),
      timeBounds: {
        ...timeBounds,
        nowAt: new Date(now).toISOString(),
      },
      series: filteredRuns.map((run) => ({
        timestamp: run.capturedAt,
        knownVacancies: run.totals.knownVacancies,
        sinCupo: run.totals.sinCupo,
        cupoBajo: run.totals.cupoBajo,
        cupoDisponible: run.totals.cupoDisponible,
        sinDatos: run.totals.sinDatos,
      })),
      topDrops,
    };
  },
});

export const getVacancyTrends = query({
  args: {
    careerSlug: v.string(),
    period: v.string(),
    range: v.string(),
    maxPoints: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const requestedMax = typeof args.maxPoints === 'number' ? Math.floor(args.maxPoints) : 18;
    const maxPoints = Math.max(8, Math.min(requestedMax, 40));

    const [current, changes, runs, allWindows] = await Promise.all([
      ctx.db
        .query('vacancyCurrent')
        .withIndex('by_career_period', (q) =>
          q.eq('careerSlug', args.careerSlug).eq('period', args.period)
        )
        .collect(),
      ctx.db
        .query('vacancyChanges')
        .withIndex('by_career_period_capturedAt', (q) =>
          q.eq('careerSlug', args.careerSlug).eq('period', args.period)
        )
        .collect(),
      ctx.db
        .query('vacancyProbeRuns')
        .withIndex('by_career_period_capturedAt', (q) =>
          q.eq('careerSlug', args.careerSlug).eq('period', args.period)
        )
        .collect(),
      ctx.db
        .query('enrollmentWindows')
        .withIndex('by_period', (q) => q.eq('period', args.period))
        .collect(),
    ]);

    const windows = windowsForCareer(allWindows as EnrollmentWindowRecord[], args.careerSlug);
    const timeBounds = resolveTimeBounds(windows, now);
    const cycleStartMs = timeBounds.startAt ? parseIsoMs(timeBounds.startAt) : null;
    const cycleEndMs = timeBounds.endAt ? parseIsoMs(timeBounds.endAt) : null;
    const rangeStartMs = parseIsoMs(rangeStart(args.range, now));
    const effectiveStartMs =
      typeof rangeStartMs === 'number' && typeof cycleStartMs === 'number'
        ? Math.max(rangeStartMs, cycleStartMs)
        : typeof rangeStartMs === 'number'
          ? rangeStartMs
          : cycleStartMs;

    const inRange = (capturedAt: string) => {
      const capturedAtMs = parseIsoMs(capturedAt);
      if (typeof capturedAtMs !== 'number') return false;
      if (typeof effectiveStartMs === 'number' && capturedAtMs < effectiveStartMs) return false;
      if (typeof cycleEndMs === 'number' && capturedAtMs > cycleEndMs) return false;
      return true;
    };

    const filteredRuns = runs.filter((item) => inRange(item.capturedAt));
    const filteredChanges = changes.filter((item) => inRange(item.capturedAt));

    const anchorIso = filteredRuns.length
      ? filteredRuns[filteredRuns.length - 1]!.capturedAt
      : new Date(now).toISOString();
    const anchorMs = parseIsoMs(anchorIso) || now;

    const subjectTotals = new Map<string, number>();
    const materiaTotals = new Map<string, number>();
    const subjectToMateria = new Map<string, string>();
    const commissionState = new Map<
      string,
      { subjectId: string; materiaId: string; vacantes: number | null }
    >();

    current.forEach((row) => {
      const materiaId = materiaIdFromLabel(row.subjectLabel, row.subjectId);
      const value = vacancyNumber(row.vacantes);
      subjectTotals.set(row.subjectId, (subjectTotals.get(row.subjectId) || 0) + value);
      materiaTotals.set(materiaId, (materiaTotals.get(materiaId) || 0) + value);
      subjectToMateria.set(row.subjectId, materiaId);
      commissionState.set(row.key, {
        subjectId: row.subjectId,
        materiaId,
        vacantes: row.vacantes,
      });
    });

    const subjectTrends = new Map<string, TrendPoint[]>();
    const materiaTrends = new Map<string, TrendPoint[]>();

    subjectTotals.forEach((value, subjectId) =>
      upsertTrendPoint(subjectTrends, subjectId, anchorMs, value)
    );
    materiaTotals.forEach((value, materiaId) =>
      upsertTrendPoint(materiaTrends, materiaId, anchorMs, value)
    );

    const changesByTimestamp = new Map<string, typeof filteredChanges>();
    filteredChanges.forEach((row) => {
      const existing = changesByTimestamp.get(row.capturedAt);
      if (existing) {
        existing.push(row);
      } else {
        changesByTimestamp.set(row.capturedAt, [row]);
      }
    });

    const timestampsDesc = Array.from(changesByTimestamp.keys()).sort((a, b) =>
      b.localeCompare(a, 'en')
    );

    timestampsDesc.forEach((capturedAt) => {
      const capturedAtMs = parseIsoMs(capturedAt);
      if (typeof capturedAtMs !== 'number') return;
      const group = changesByTimestamp.get(capturedAt) || [];
      if (!group.length) return;

      const changedSubjects = new Set<string>();
      const changedMaterias = new Set<string>();
      group.forEach((change) => {
        const tracked = commissionState.get(change.key);
        const subjectId = tracked?.subjectId || change.subjectId;
        const materiaId =
          tracked?.materiaId ||
          subjectToMateria.get(subjectId) ||
          materiaIdFromLabel(change.subjectLabel, subjectId);
        subjectToMateria.set(subjectId, materiaId);
        changedSubjects.add(subjectId);
        changedMaterias.add(materiaId);
      });

      changedSubjects.forEach((subjectId) =>
        upsertTrendPoint(subjectTrends, subjectId, capturedAtMs, subjectTotals.get(subjectId) || 0)
      );
      changedMaterias.forEach((materiaId) =>
        upsertTrendPoint(materiaTrends, materiaId, capturedAtMs, materiaTotals.get(materiaId) || 0)
      );

      group.forEach((change) => {
        const tracked = commissionState.get(change.key);
        const subjectId = tracked?.subjectId || change.subjectId;
        const materiaId =
          tracked?.materiaId ||
          subjectToMateria.get(subjectId) ||
          materiaIdFromLabel(change.subjectLabel, subjectId);

        const currentVacantes = tracked ? tracked.vacantes : change.vacantes;
        commissionState.set(change.key, {
          subjectId,
          materiaId,
          vacantes: change.prevVacantes,
        });

        const delta = vacancyNumber(change.prevVacantes) - vacancyNumber(currentVacantes);
        subjectTotals.set(subjectId, (subjectTotals.get(subjectId) || 0) + delta);
        materiaTotals.set(materiaId, (materiaTotals.get(materiaId) || 0) + delta);
      });
    });

    const toSeriesObject = (source: Map<string, TrendPoint[]>) => {
      const entries = Array.from(source.entries()).map(([entityId, points]) => {
        const sortedPoints = [...points].sort((a, b) => a.t - b.t);
        const sampled = downsampleTrend(sortedPoints, maxPoints).map((point) =>
          Math.max(0, Math.round(point.v))
        );
        return [entityId, sampled] as const;
      });
      return Object.fromEntries(entries);
    };

    return {
      anchorAt: anchorIso,
      subject: toSeriesObject(subjectTrends),
      materia: toSeriesObject(materiaTrends),
    };
  },
});

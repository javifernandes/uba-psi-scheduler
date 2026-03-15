import { query } from './_generated/server';
import { v } from 'convex/values';

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
    const startIso = rangeStart(args.range, now);

    const runs = await ctx.db
      .query('vacancyProbeRuns')
      .withIndex('by_career_period_capturedAt', (q) =>
        q.eq('careerSlug', args.careerSlug).eq('period', args.period)
      )
      .collect();
    const filteredRuns = startIso ? runs.filter((item) => item.capturedAt >= startIso) : runs;

    const changes = await ctx.db
      .query('vacancyChanges')
      .withIndex('by_career_period_capturedAt', (q) =>
        q.eq('careerSlug', args.careerSlug).eq('period', args.period)
      )
      .collect();
    const filteredChanges = startIso
      ? changes.filter((item) => item.capturedAt >= startIso)
      : changes;

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

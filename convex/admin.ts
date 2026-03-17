import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { parseIsoMs, windowsForCareer, type EnrollmentWindowRecord } from './windows';

const TABLES = [
  'offerSubjects',
  'vacancyCurrent',
  'vacancyProbeRuns',
  'vacancyChanges',
  'vacancyCapacity',
] as const;

type TableName = (typeof TABLES)[number];

const countTable = async (ctx: any, tableName: TableName) =>
  (await ctx.db.query(tableName).collect()).length;

type InitialBaselineQuality = 'pre_window' | 'post_window' | 'unknown';

const resolveInitialQuality = (
  capturedAt: string,
  firstWindowStartMs: number | null
): InitialBaselineQuality => {
  const capturedAtMs = parseIsoMs(capturedAt);
  if (typeof capturedAtMs !== 'number' || typeof firstWindowStartMs !== 'number') return 'unknown';
  return capturedAtMs < firstWindowStartMs ? 'pre_window' : 'post_window';
};

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const stats = await Promise.all(
      TABLES.map(async (table) => ({
        table,
        rows: await countTable(ctx, table),
      }))
    );
    return {
      tables: Object.fromEntries(stats.map((item) => [item.table, item.rows])),
      totalRows: stats.reduce((acc, item) => acc + item.rows, 0),
      generatedAt: new Date().toISOString(),
    };
  },
});

export const resetAllData = mutation({
  args: {
    confirm: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== 'DROP_ALL_DATA') {
      throw new Error('Confirmación inválida. Usá confirm=DROP_ALL_DATA');
    }

    const deleted: Record<string, number> = {};
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      deleted[table] = rows.length;
    }

    return {
      status: 'ok',
      deleted,
      deletedTotal: Object.values(deleted).reduce((acc, n) => acc + n, 0),
      completedAt: new Date().toISOString(),
    };
  },
});

export const recomputeVacancyCapacity = mutation({
  args: {
    careerSlug: v.string(),
    period: v.string(),
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const safeBatchSize = Math.max(5, Math.min(Math.floor(args.batchSize || 25), 50));
    const page = await ctx.db
      .query('vacancyCurrent')
      .withIndex('by_career_period', (q) =>
        q.eq('careerSlug', args.careerSlug).eq('period', args.period)
      )
      .paginate({
        numItems: safeBatchSize,
        cursor: args.cursor || null,
      });

    const [runs, windows] = await Promise.all([
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

    const runsByProbeId = new Map(runs.map((run) => [run.probeId, run]));
    const windowsForCurrentCareer = windowsForCareer(
      windows as EnrollmentWindowRecord[],
      args.careerSlug
    ).filter((window) => window.enabled);
    const firstWindowStartMs = windowsForCurrentCareer.reduce<number | null>((acc, window) => {
      const startMs = parseIsoMs(window.startAt);
      if (typeof startMs !== 'number') return acc;
      if (typeof acc !== 'number') return startMs;
      return Math.min(acc, startMs);
    }, null);

    let processed = 0;
    let inserted = 0;
    let patched = 0;

    for (const current of page.page) {
      processed += 1;
      const changeRows = await ctx.db
        .query('vacancyChanges')
        .withIndex('by_key_capturedAt', (q) => q.eq('key', current.key))
        .collect();

      const observations: Array<{
        vacantes: number;
        capturedAt: string;
        sourceRunId: string | null;
      }> = changeRows
        .filter((row) => typeof row.vacantes === 'number')
        .map((row) => ({
          vacantes: row.vacantes as number,
          capturedAt: row.capturedAt,
          sourceRunId: row.sourceRunId ?? null,
        }));

      if (typeof current.vacantes === 'number') {
        const currentRun = runsByProbeId.get(current.probeId);
        observations.push({
          vacantes: current.vacantes,
          capturedAt: current.updatedAt,
          sourceRunId: currentRun?.sourceRunId ?? null,
        });
      }

      const sortedByTime = [...observations].sort((a, b) =>
        a.capturedAt.localeCompare(b.capturedAt)
      );
      const initial = sortedByTime[0] || null;
      const max = observations.reduce<(typeof observations)[number] | null>((acc, item) => {
        if (!acc || item.vacantes > acc.vacantes) return item;
        return acc;
      }, null);

      const existingCapacity = await ctx.db
        .query('vacancyCapacity')
        .withIndex('by_commission', (q) =>
          q
            .eq('careerSlug', args.careerSlug)
            .eq('period', args.period)
            .eq('subjectId', current.subjectId)
            .eq('commissionId', current.commissionId)
        )
        .first();

      const payload = {
        careerSlug: args.careerSlug,
        period: args.period,
        subjectId: current.subjectId,
        commissionId: current.commissionId,
        initialVacantesObserved: initial ? initial.vacantes : null,
        initialSourceRunId: initial?.sourceRunId || null,
        initialBaselineQuality: initial
          ? resolveInitialQuality(initial.capturedAt, firstWindowStartMs)
          : 'unknown',
        maxVacantesObserved: max ? max.vacantes : null,
        maxSourceRunId: max?.sourceRunId || null,
      } as const;

      if (existingCapacity) {
        await ctx.db.patch(existingCapacity._id, payload);
        patched += 1;
      } else {
        await ctx.db.insert('vacancyCapacity', payload);
        inserted += 1;
      }
    }

    return {
      status: 'ok',
      careerSlug: args.careerSlug,
      period: args.period,
      processed,
      inserted,
      patched,
      done: page.isDone,
      nextCursor: page.continueCursor,
    };
  },
});

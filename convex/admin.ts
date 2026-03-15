import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const TABLES = ['offerSubjects', 'vacancyCurrent', 'vacancyProbeRuns', 'vacancyChanges'] as const;
const STATS_SAMPLE_LIMIT = 500;
const DEFAULT_RESET_BATCH_SIZE = 200;
const MAX_RESET_BATCH_SIZE = 1000;

type TableName = (typeof TABLES)[number];

const sampleCountTable = async (ctx: any, tableName: TableName) => {
  const rows = await ctx.db.query(tableName).take(STATS_SAMPLE_LIMIT + 1);
  const capped = rows.length > STATS_SAMPLE_LIMIT;
  return {
    rows: capped ? STATS_SAMPLE_LIMIT : rows.length,
    capped,
  };
};

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const stats = await Promise.all(
      TABLES.map(async (table) => ({
        table,
        ...(await sampleCountTable(ctx, table)),
      }))
    );
    const tables = Object.fromEntries(stats.map((item) => [item.table, item.rows]));
    const cappedTables = stats.filter((item) => item.capped).map((item) => item.table);

    return {
      tables,
      cappedTables,
      sampleLimit: STATS_SAMPLE_LIMIT,
      totalRows: stats.reduce((acc, item) => acc + item.rows, 0),
      generatedAt: new Date().toISOString(),
    };
  },
});

export const resetAllData = mutation({
  args: {
    confirm: v.string(),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.confirm !== 'DROP_ALL_DATA') {
      throw new Error('Confirmación inválida. Usá confirm=DROP_ALL_DATA');
    }

    const requestedBatch = Number.isFinite(args.batchSize ?? NaN)
      ? Math.floor(args.batchSize!)
      : DEFAULT_RESET_BATCH_SIZE;
    const batchSize = Math.max(1, Math.min(MAX_RESET_BATCH_SIZE, requestedBatch));

    const deleted: Record<string, number> = {};
    let hasMore = false;
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).take(batchSize);
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      deleted[table] = rows.length;
      if (rows.length === batchSize) {
        hasMore = true;
      }
    }

    const deletedTotal = Object.values(deleted).reduce((acc, n) => acc + n, 0);
    return {
      status: hasMore ? 'partial' : 'ok',
      deleted,
      deletedTotal,
      hasMore,
      batchSize,
      completedAt: new Date().toISOString(),
    };
  },
});

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const TABLES = ['offerSubjects', 'vacancyCurrent', 'vacancyProbeRuns', 'vacancyChanges'] as const;

type TableName = (typeof TABLES)[number];

const countTable = async (ctx: any, tableName: TableName) =>
  (await ctx.db.query(tableName).collect()).length;

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

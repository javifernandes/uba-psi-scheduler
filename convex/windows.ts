import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export type EnrollmentWindowRecord = {
  key: string;
  windowId: string;
  label: string;
  careerSlug: string;
  period: string;
  startAt: string;
  endAt: string;
  kind: string;
  enabled: boolean;
  source: string;
  updatedAt: string;
};

const dayMs = 24 * 60 * 60 * 1000;

export const parseIsoMs = (iso: string) => {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export const windowsForCareer = (windows: EnrollmentWindowRecord[], careerSlug: string) => {
  const specific = windows.filter((window) => window.careerSlug === careerSlug);
  if (specific.length) return specific;
  return windows.filter((window) => window.careerSlug === '*');
};

export const resolveTimeBounds = (windows: EnrollmentWindowRecord[], nowMs: number) => {
  const enabledWindows = windows.filter((window) => window.enabled);
  const ranges = enabledWindows
    .map((window) => ({
      ...window,
      startMs: parseIsoMs(window.startAt),
      endMs: parseIsoMs(window.endAt),
    }))
    .filter(
      (window): window is EnrollmentWindowRecord & { startMs: number; endMs: number } =>
        typeof window.startMs === 'number' && typeof window.endMs === 'number'
    );

  if (!ranges.length) {
    return {
      startAt: null as string | null,
      endAt: null as string | null,
      phase: 'unknown' as 'before' | 'open' | 'closed' | 'unknown',
      daysTotal: null as number | null,
      daysElapsed: null as number | null,
      daysRemaining: null as number | null,
      activeWindowId: null as string | null,
      activeWindowLabel: null as string | null,
    };
  }

  const startMs = Math.min(...ranges.map((window) => window.startMs));
  const endMs = Math.max(...ranges.map((window) => window.endMs));
  const totalDays = Math.max(0, (endMs - startMs) / dayMs);
  const elapsedDays = Math.min(totalDays, Math.max(0, (nowMs - startMs) / dayMs));
  const remainingDays = Math.max(0, (endMs - nowMs) / dayMs);
  const active = ranges.find((window) => window.startMs <= nowMs && nowMs <= window.endMs) || null;

  let phase: 'before' | 'open' | 'closed' = 'open';
  if (nowMs < startMs) phase = 'before';
  else if (nowMs > endMs) phase = 'closed';

  return {
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
    phase,
    daysTotal: round1(totalDays),
    daysElapsed: round1(elapsedDays),
    daysRemaining: round1(remainingDays),
    activeWindowId: active?.windowId || null,
    activeWindowLabel: active?.label || null,
  };
};

const findActiveWindow = (windows: EnrollmentWindowRecord[], nowMs: number) =>
  windows
    .filter((window) => window.enabled)
    .map((window) => ({
      ...window,
      startMs: parseIsoMs(window.startAt),
      endMs: parseIsoMs(window.endAt),
    }))
    .find(
      (window) =>
        typeof window.startMs === 'number' &&
        typeof window.endMs === 'number' &&
        window.startMs <= nowMs &&
        nowMs <= window.endMs
    ) || null;

export const upsertEnrollmentWindows = mutation({
  args: {
    source: v.string(),
    windows: v.array(
      v.object({
        windowId: v.string(),
        label: v.string(),
        careerSlug: v.optional(v.string()),
        period: v.string(),
        startAt: v.string(),
        endAt: v.string(),
        kind: v.string(),
        enabled: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const nowIso = new Date().toISOString();
    const incoming = args.windows.map((window) => {
      const careerSlug = window.careerSlug || '*';
      return {
        key: `${careerSlug}:${window.period}:${window.windowId}`,
        windowId: window.windowId,
        label: window.label,
        careerSlug,
        period: window.period,
        startAt: window.startAt,
        endAt: window.endAt,
        kind: window.kind,
        enabled: window.enabled,
        source: args.source,
      };
    });

    const incomingKeys = new Set(incoming.map((window) => window.key));
    const existing = await ctx.db.query('enrollmentWindows').collect();
    let removed = 0;
    for (const row of existing) {
      if (row.source !== args.source) continue;
      if (incomingKeys.has(row.key)) continue;
      await ctx.db.delete(row._id);
      removed += 1;
    }

    let inserted = 0;
    let patched = 0;
    for (const window of incoming) {
      const current = await ctx.db
        .query('enrollmentWindows')
        .withIndex('by_key', (q) => q.eq('key', window.key))
        .first();
      if (current) {
        await ctx.db.patch(current._id, {
          ...window,
          updatedAt: nowIso,
        });
        patched += 1;
      } else {
        await ctx.db.insert('enrollmentWindows', {
          ...window,
          updatedAt: nowIso,
        });
        inserted += 1;
      }
    }

    return {
      status: 'ok',
      source: args.source,
      incoming: incoming.length,
      inserted,
      patched,
      removed,
      updatedAt: nowIso,
    };
  },
});

export const getEnrollmentWindow = query({
  args: {
    careerSlug: v.string(),
    period: v.string(),
  },
  handler: async (ctx, args) => {
    const allWindows = await ctx.db
      .query('enrollmentWindows')
      .withIndex('by_period', (q) => q.eq('period', args.period))
      .collect();
    const windows = windowsForCareer(allWindows as EnrollmentWindowRecord[], args.careerSlug).sort(
      (a, b) => a.startAt.localeCompare(b.startAt)
    );
    return {
      period: args.period,
      careerSlug: args.careerSlug,
      windows: windows.map((window) => ({
        windowId: window.windowId,
        label: window.label,
        startAt: window.startAt,
        endAt: window.endAt,
        kind: window.kind,
        enabled: window.enabled,
      })),
      timeBounds: resolveTimeBounds(windows, Date.now()),
    };
  },
});

export const getScrapeWindowStatus = query({
  args: {
    trigger: v.union(v.literal('schedule'), v.literal('manual')),
    force: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = new Date();
    const nowMs = now.getTime();
    const allWindows = await ctx.db.query('enrollmentWindows').collect();
    const activeWindow = findActiveWindow(allWindows as EnrollmentWindowRecord[], nowMs);

    let shouldRun = false;
    let reason = 'outside_window';

    if (args.force) {
      shouldRun = true;
      reason = 'force_run';
    } else if (!activeWindow) {
      shouldRun = false;
      reason = 'outside_window';
    } else if (args.trigger === 'manual') {
      shouldRun = true;
      reason = 'manual_run_active_window';
    } else {
      shouldRun = true;
      reason = 'schedule_active_window';
    }

    return {
      shouldRun,
      reason,
      trigger: args.trigger,
      profile: shouldRun ? 'window_open' : 'none',
      activeWindowId: activeWindow?.windowId || '',
      activeWindowLabel: activeWindow?.label || '',
      nowIso: now.toISOString(),
      nowLocal: now.toISOString(),
    };
  },
});

export const closeEnrollmentWindow = mutation({
  args: {
    windowId: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const nowIso = new Date().toISOString();
    const nowMs = Date.parse(nowIso);

    const allWindows = await ctx.db.query('enrollmentWindows').collect();
    const target = args.windowId
      ? (allWindows.find((window) => window.windowId === args.windowId) as
          | EnrollmentWindowRecord
          | undefined)
      : findActiveWindow(allWindows as EnrollmentWindowRecord[], nowMs);

    if (!target) {
      throw new Error(
        args.windowId ? `No existe ventana ${args.windowId}.` : 'No hay ventana activa.'
      );
    }

    const row = await ctx.db
      .query('enrollmentWindows')
      .withIndex('by_key', (q) => q.eq('key', target.key))
      .first();
    if (!row) {
      throw new Error(`No se encontró fila para ventana ${target.windowId}.`);
    }

    await ctx.db.patch(row._id, {
      endAt: nowIso,
      updatedAt: nowIso,
      source: args.source || row.source,
    });

    return {
      status: 'ok',
      closedWindowId: target.windowId,
      closeAt: nowIso,
    };
  },
});

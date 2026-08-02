import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const progressStatus = v.union(
  v.literal('in_progress'),
  v.literal('regularized'),
  v.literal('approved')
);

export const listCurrentUserProgress = query({
  args: { planVersion: v.string() },
  handler: async (ctx, { planVersion }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db
      .query('planProgress')
      .withIndex('by_user_plan', (q) =>
        q.eq('tokenIdentifier', identity.tokenIdentifier).eq('planVersion', planVersion)
      )
      .collect();
  },
});

export const setCurrentUserCourseProgress = mutation({
  args: {
    planVersion: v.string(),
    courseId: v.string(),
    status: v.union(progressStatus, v.null()),
  },
  handler: async (ctx, { planVersion, courseId, status }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');
    const existing = await ctx.db
      .query('planProgress')
      .withIndex('by_user_plan_course', (q) =>
        q
          .eq('tokenIdentifier', identity.tokenIdentifier)
          .eq('planVersion', planVersion)
          .eq('courseId', courseId)
      )
      .unique();

    if (status === null) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }

    const next = { status, updatedAt: new Date().toISOString() };
    if (existing) {
      await ctx.db.patch(existing._id, next);
      return existing._id;
    }
    return await ctx.db.insert('planProgress', {
      tokenIdentifier: identity.tokenIdentifier,
      planVersion,
      courseId,
      ...next,
    });
  },
});

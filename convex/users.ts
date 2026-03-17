import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { resolveUserProfileFields, type UserProfileFields } from './users.profile';
import { ensureUserRoles, isAdminRole } from './users.roles';

const isoNow = () => new Date().toISOString();

export const upsertCurrentUser = mutation({
  args: {
    email: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    name: v.optional(v.string()),
    givenName: v.optional(v.string()),
    familyName: v.optional(v.string()),
    nickname: v.optional(v.string()),
    preferredUsername: v.optional(v.string()),
    pictureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const resolvedProfile = resolveUserProfileFields(
      {
        email: identity.email,
        emailVerified: identity.emailVerified,
        name: identity.name,
        givenName: identity.givenName,
        familyName: identity.familyName,
        nickname: identity.nickname,
        preferredUsername: identity.preferredUsername,
        pictureUrl: identity.pictureUrl,
      },
      args as UserProfileFields
    );

    const now = isoNow();
    const existing = await ctx.db
      .query('users')
      .withIndex('by_token_identifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique();

    const patch = {
      subject: identity.subject,
      issuer: identity.issuer,
      updatedAt: now,
      lastSeenAt: now,
      ...resolvedProfile,
    };

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...patch,
        ...(existing.roles && existing.roles.length ? {} : { roles: ensureUserRoles(undefined) }),
      });
      return { _id: existing._id };
    }

    const _id = await ctx.db.insert('users', {
      tokenIdentifier: identity.tokenIdentifier,
      roles: ensureUserRoles(undefined),
      createdAt: now,
      ...patch,
    });
    return { _id };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query('users')
      .withIndex('by_token_identifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique();
  },
});

export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query('users')
      .withIndex('by_token_identifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .unique();

    return isAdminRole(user?.roles);
  },
});

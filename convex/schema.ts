import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    subject: v.string(),
    issuer: v.string(),
    roles: v.optional(v.array(v.string())),
    email: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    name: v.optional(v.string()),
    givenName: v.optional(v.string()),
    familyName: v.optional(v.string()),
    nickname: v.optional(v.string()),
    preferredUsername: v.optional(v.string()),
    pictureUrl: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastSeenAt: v.string(),
  })
    .index('by_token_identifier', ['tokenIdentifier'])
    .index('by_subject_issuer', ['subject', 'issuer']),

  offerSubjects: defineTable({
    careerSlug: v.string(),
    careerLabel: v.string(),
    period: v.string(),
    subjectId: v.string(),
    label: v.string(),
    header: v.string(),
    slots: v.array(v.any()),
    updatedAt: v.string(),
  })
    .index('by_career_period', ['careerSlug', 'period'])
    .index('by_career_period_subject', ['careerSlug', 'period', 'subjectId']),

  vacancyCurrent: defineTable({
    key: v.string(),
    careerSlug: v.string(),
    period: v.string(),
    subjectId: v.string(),
    subjectLabel: v.string(),
    commissionId: v.string(),
    vacantes: v.union(v.number(), v.null()),
    status: v.string(),
    updatedAt: v.string(),
    probeId: v.string(),
  })
    .index('by_key', ['key'])
    .index('by_career_period', ['careerSlug', 'period']),

  vacancyProbeRuns: defineTable({
    sourceRunId: v.string(),
    probeId: v.string(),
    careerSlug: v.string(),
    period: v.string(),
    capturedAt: v.string(),
    totals: v.object({
      knownVacancies: v.number(),
      sinCupo: v.number(),
      cupoBajo: v.number(),
      cupoDisponible: v.number(),
      sinDatos: v.number(),
      totalCommissions: v.number(),
    }),
    changedCount: v.number(),
    ingestedAt: v.string(),
  })
    .index('by_source_run_id', ['sourceRunId'])
    .index('by_probe_id', ['probeId'])
    .index('by_career_period_capturedAt', ['careerSlug', 'period', 'capturedAt']),

  vacancyChanges: defineTable({
    probeId: v.string(),
    sourceRunId: v.string(),
    careerSlug: v.string(),
    period: v.string(),
    key: v.string(),
    subjectId: v.string(),
    subjectLabel: v.string(),
    commissionId: v.string(),
    prevVacantes: v.union(v.number(), v.null()),
    vacantes: v.union(v.number(), v.null()),
    delta: v.union(v.number(), v.null()),
    status: v.string(),
    capturedAt: v.string(),
  })
    .index('by_career_period_capturedAt', ['careerSlug', 'period', 'capturedAt'])
    .index('by_key_capturedAt', ['key', 'capturedAt']),

  vacancyCapacity: defineTable({
    careerSlug: v.string(),
    period: v.string(),
    subjectId: v.string(),
    commissionId: v.string(),
    initialVacantesObserved: v.union(v.number(), v.null()),
    initialSourceRunId: v.union(v.string(), v.null()),
    initialBaselineQuality: v.union(
      v.literal('pre_window'),
      v.literal('post_window'),
      v.literal('unknown')
    ),
    maxVacantesObserved: v.union(v.number(), v.null()),
    maxSourceRunId: v.union(v.string(), v.null()),
  })
    .index('by_career_period', ['careerSlug', 'period'])
    .index('by_commission', ['careerSlug', 'period', 'subjectId', 'commissionId']),

  enrollmentWindows: defineTable({
    key: v.string(),
    windowId: v.string(),
    label: v.string(),
    careerSlug: v.string(),
    period: v.string(),
    startAt: v.string(),
    endAt: v.string(),
    kind: v.string(),
    enabled: v.boolean(),
    source: v.string(),
    updatedAt: v.string(),
  })
    .index('by_key', ['key'])
    .index('by_period', ['period'])
    .index('by_period_career', ['period', 'careerSlug']),
});

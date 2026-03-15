import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
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

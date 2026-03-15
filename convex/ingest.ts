import { internalMutation } from './_generated/server';
import { v } from 'convex/values';
import { parseIsoMs, windowsForCareer, type EnrollmentWindowRecord } from './windows';

type SubjectInput = {
  id: string;
  label: string;
  header: string;
  slots: Array<{
    tipo: 'teo' | 'sem' | 'prac';
    id: string;
    vacantes?: number | null;
    [key: string]: unknown;
  }>;
};

const buildKey = (careerSlug: string, period: string, subjectId: string, commissionId: string) =>
  `${careerSlug}:${period}:${subjectId}:${commissionId}`;

const vacancyStatus = (vacantes: number | null) => {
  if (vacantes === null) return 'sin_datos';
  if (vacantes === 0) return 'sin_cupo';
  if (vacantes <= 10) return 'cupo_bajo';
  return 'cupo_disponible';
};

type InitialBaselineQuality = 'pre_window' | 'post_window' | 'unknown';

const resolveInitialQuality = (
  capturedAt: string,
  firstWindowStartMs: number | null
): InitialBaselineQuality => {
  const capturedAtMs = parseIsoMs(capturedAt);
  if (typeof capturedAtMs !== 'number' || typeof firstWindowStartMs !== 'number') return 'unknown';
  return capturedAtMs < firstWindowStartMs ? 'pre_window' : 'post_window';
};

export const ingestOfferProbe = internalMutation({
  args: {
    sourceRunId: v.string(),
    capturedAt: v.string(),
    careerSlug: v.string(),
    careerLabel: v.string(),
    period: v.string(),
    subjects: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const duplicate = await ctx.db
      .query('vacancyProbeRuns')
      .withIndex('by_source_run_id', (q) => q.eq('sourceRunId', args.sourceRunId))
      .first();
    if (duplicate) {
      return {
        status: 'duplicate',
        probeId: duplicate.probeId,
      };
    }

    const parsedSubjects = args.subjects as SubjectInput[];
    const probeId = `${args.careerSlug}:${args.period}:${args.capturedAt}`;
    const ingestedAt = new Date().toISOString();
    const windows = await ctx.db
      .query('enrollmentWindows')
      .withIndex('by_period', (q) => q.eq('period', args.period))
      .collect();
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

    const existingSubjects = await ctx.db
      .query('offerSubjects')
      .withIndex('by_career_period', (q) =>
        q.eq('careerSlug', args.careerSlug).eq('period', args.period)
      )
      .collect();
    const existingBySubjectId = new Map(existingSubjects.map((item) => [item.subjectId, item]));

    for (const subject of parsedSubjects) {
      const previous = existingBySubjectId.get(subject.id);
      const payload = {
        careerSlug: args.careerSlug,
        careerLabel: args.careerLabel,
        period: args.period,
        subjectId: subject.id,
        label: subject.label,
        header: subject.header,
        slots: subject.slots,
        updatedAt: args.capturedAt,
      };
      if (previous) {
        await ctx.db.patch(previous._id, payload);
      } else {
        await ctx.db.insert('offerSubjects', payload);
      }
    }

    const existingCurrent = await ctx.db
      .query('vacancyCurrent')
      .withIndex('by_career_period', (q) =>
        q.eq('careerSlug', args.careerSlug).eq('period', args.period)
      )
      .collect();
    const currentByKey = new Map(existingCurrent.map((item) => [item.key, item]));
    const existingCapacity = await ctx.db
      .query('vacancyCapacity')
      .withIndex('by_career_period', (q) =>
        q.eq('careerSlug', args.careerSlug).eq('period', args.period)
      )
      .collect();
    const capacityByCommissionKey = new Map(
      existingCapacity.map((item) => [
        buildKey(args.careerSlug, args.period, item.subjectId, item.commissionId),
        item,
      ])
    );

    const nextRows = parsedSubjects.flatMap((subject) =>
      subject.slots
        .filter((slot) => slot.tipo === 'prac')
        .map((slot) => ({
          key: buildKey(args.careerSlug, args.period, subject.id, slot.id),
          subjectId: subject.id,
          subjectLabel: subject.label,
          commissionId: slot.id,
          vacantes: typeof slot.vacantes === 'number' ? slot.vacantes : null,
        }))
    );
    const nextByKey = new Map(nextRows.map((item) => [item.key, item]));

    const changes: Array<{
      key: string;
      subjectId: string;
      subjectLabel: string;
      commissionId: string;
      prevVacantes: number | null;
      vacantes: number | null;
      delta: number | null;
      status: string;
    }> = [];

    for (const row of nextRows) {
      const prev = currentByKey.get(row.key);
      const prevVacantes = prev ? prev.vacantes : null;
      const nextVacantes = row.vacantes;
      const changed = prevVacantes !== nextVacantes;
      if (changed) {
        const delta =
          typeof prevVacantes === 'number' && typeof nextVacantes === 'number'
            ? nextVacantes - prevVacantes
            : null;
        changes.push({
          key: row.key,
          subjectId: row.subjectId,
          subjectLabel: row.subjectLabel,
          commissionId: row.commissionId,
          prevVacantes,
          vacantes: nextVacantes,
          delta,
          status: vacancyStatus(nextVacantes),
        });
      }
      const payload = {
        key: row.key,
        careerSlug: args.careerSlug,
        period: args.period,
        subjectId: row.subjectId,
        subjectLabel: row.subjectLabel,
        commissionId: row.commissionId,
        vacantes: nextVacantes,
        status: vacancyStatus(nextVacantes),
        updatedAt: args.capturedAt,
        probeId,
      };
      if (prev) {
        await ctx.db.patch(prev._id, payload);
      } else {
        await ctx.db.insert('vacancyCurrent', payload);
      }

      const currentCapacity = capacityByCommissionKey.get(row.key);
      const isNumericVacancy = typeof nextVacantes === 'number';
      if (!currentCapacity) {
        await ctx.db.insert('vacancyCapacity', {
          careerSlug: args.careerSlug,
          period: args.period,
          subjectId: row.subjectId,
          commissionId: row.commissionId,
          initialVacantesObserved: isNumericVacancy ? nextVacantes : null,
          initialSourceRunId: isNumericVacancy ? args.sourceRunId : null,
          initialBaselineQuality: isNumericVacancy
            ? resolveInitialQuality(args.capturedAt, firstWindowStartMs)
            : 'unknown',
          maxVacantesObserved: isNumericVacancy ? nextVacantes : null,
          maxSourceRunId: isNumericVacancy ? args.sourceRunId : null,
        });
        continue;
      }

      const capacityPatch: Record<string, unknown> = {};
      if (isNumericVacancy && currentCapacity.initialVacantesObserved === null) {
        capacityPatch.initialVacantesObserved = nextVacantes;
        capacityPatch.initialSourceRunId = args.sourceRunId;
        capacityPatch.initialBaselineQuality = resolveInitialQuality(
          args.capturedAt,
          firstWindowStartMs
        );
      }
      if (
        isNumericVacancy &&
        (currentCapacity.maxVacantesObserved === null ||
          nextVacantes > currentCapacity.maxVacantesObserved)
      ) {
        capacityPatch.maxVacantesObserved = nextVacantes;
        capacityPatch.maxSourceRunId = args.sourceRunId;
      }
      if (Object.keys(capacityPatch).length > 0) {
        await ctx.db.patch(currentCapacity._id, capacityPatch);
      }
    }

    for (const prev of existingCurrent) {
      if (nextByKey.has(prev.key)) continue;
      await ctx.db.delete(prev._id);
      changes.push({
        key: prev.key,
        subjectId: prev.subjectId,
        subjectLabel: prev.subjectLabel,
        commissionId: prev.commissionId,
        prevVacantes: prev.vacantes,
        vacantes: null,
        delta: null,
        status: 'sin_datos',
      });
    }

    const totals = nextRows.reduce(
      (acc, item) => {
        acc.totalCommissions += 1;
        if (item.vacantes === null) {
          acc.sinDatos += 1;
          return acc;
        }
        acc.knownVacancies += item.vacantes;
        if (item.vacantes === 0) acc.sinCupo += 1;
        else if (item.vacantes <= 10) acc.cupoBajo += 1;
        else acc.cupoDisponible += 1;
        return acc;
      },
      {
        knownVacancies: 0,
        sinCupo: 0,
        cupoBajo: 0,
        cupoDisponible: 0,
        sinDatos: 0,
        totalCommissions: 0,
      }
    );

    await ctx.db.insert('vacancyProbeRuns', {
      sourceRunId: args.sourceRunId,
      probeId,
      careerSlug: args.careerSlug,
      period: args.period,
      capturedAt: args.capturedAt,
      totals,
      changedCount: changes.length,
      ingestedAt,
    });

    for (const change of changes) {
      await ctx.db.insert('vacancyChanges', {
        probeId,
        sourceRunId: args.sourceRunId,
        careerSlug: args.careerSlug,
        period: args.period,
        key: change.key,
        subjectId: change.subjectId,
        subjectLabel: change.subjectLabel,
        commissionId: change.commissionId,
        prevVacantes: change.prevVacantes,
        vacantes: change.vacantes,
        delta: change.delta,
        status: change.status,
        capturedAt: args.capturedAt,
      });
    }

    return {
      status: 'ok',
      probeId,
      subjects: parsedSubjects.length,
      commissions: nextRows.length,
      changed: changes.length,
    };
  },
});

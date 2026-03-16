import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api, internal } from './_generated/api';

const router = httpRouter();

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type,authorization',
      'access-control-allow-methods': 'POST,OPTIONS',
    },
  });

const handleOptions = () => jsonResponse(200, { ok: true });

const parseJson = async (request: Request) => {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const hasBearer = (request: Request, token: string) => {
  if (!token) return false;
  return request.headers.get('authorization') === `Bearer ${token}`;
};

router.route({
  path: '/listCareersWithLatestPeriod',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/listCareersWithLatestPeriod',
  method: 'POST',
  handler: httpAction(async (ctx) => {
    const payload = await ctx.runQuery(api.offer.listCareersWithLatestPeriod, {});
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/listPeriodsByCareer',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/listPeriodsByCareer',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await parseJson(request);
    const careerSlug = typeof body.careerSlug === 'string' ? body.careerSlug : '';
    if (!careerSlug) return jsonResponse(400, { error: 'careerSlug es requerido' });
    const payload = await ctx.runQuery(api.offer.listPeriodsByCareer, { careerSlug });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/getOfferSubjects',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/getOfferSubjects',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await parseJson(request);
    const careerSlug = typeof body.careerSlug === 'string' ? body.careerSlug : '';
    const period = typeof body.period === 'string' ? body.period : '';
    if (!careerSlug || !period)
      return jsonResponse(400, { error: 'careerSlug y period son requeridos' });
    const payload = await ctx.runQuery(api.offer.getOfferSubjects, { careerSlug, period });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/getVacancyAnalytics',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/getVacancyAnalytics',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await parseJson(request);
    const careerSlug = typeof body.careerSlug === 'string' ? body.careerSlug : '';
    const period = typeof body.period === 'string' ? body.period : '';
    const range = typeof body.range === 'string' ? body.range : '24h';
    if (!careerSlug || !period)
      return jsonResponse(400, { error: 'careerSlug y period son requeridos' });
    const payload = await ctx.runQuery(api.offer.getVacancyAnalytics, {
      careerSlug,
      period,
      range,
    });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/getVacancyTrends',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/getVacancyTrends',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await parseJson(request);
    const careerSlug = typeof body.careerSlug === 'string' ? body.careerSlug : '';
    const period = typeof body.period === 'string' ? body.period : '';
    const range = typeof body.range === 'string' ? body.range : '24h';
    const maxPoints = typeof body.maxPoints === 'number' ? body.maxPoints : undefined;
    if (!careerSlug || !period)
      return jsonResponse(400, { error: 'careerSlug y period son requeridos' });
    const payload = await ctx.runQuery(api.offer.getVacancyTrends, {
      careerSlug,
      period,
      range,
      maxPoints,
    });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/getVacancyTopDrops',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/getVacancyTopDrops',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await parseJson(request);
    const careerSlug = typeof body.careerSlug === 'string' ? body.careerSlug : '';
    const period = typeof body.period === 'string' ? body.period : '';
    const range = typeof body.range === 'string' ? body.range : '24h';
    const limit = typeof body.limit === 'number' ? body.limit : undefined;
    if (!careerSlug || !period)
      return jsonResponse(400, { error: 'careerSlug y period son requeridos' });
    const payload = await ctx.runQuery(api.offer.getVacancyTopDrops, {
      careerSlug,
      period,
      range,
      limit,
    });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/getVacancyCapacity',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/getVacancyCapacity',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await parseJson(request);
    const careerSlug = typeof body.careerSlug === 'string' ? body.careerSlug : '';
    const period = typeof body.period === 'string' ? body.period : '';
    const includeProbeTimes = body.includeProbeTimes === true;
    if (!careerSlug || !period)
      return jsonResponse(400, { error: 'careerSlug y period son requeridos' });
    const payload = await ctx.runQuery(api.offer.getVacancyCapacity, {
      careerSlug,
      period,
      includeProbeTimes,
    });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/getEnrollmentWindow',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/getEnrollmentWindow',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await parseJson(request);
    const careerSlug = typeof body.careerSlug === 'string' ? body.careerSlug : '';
    const period = typeof body.period === 'string' ? body.period : '';
    if (!careerSlug || !period)
      return jsonResponse(400, { error: 'careerSlug y period son requeridos' });
    const payload = await ctx.runQuery(api.windows.getEnrollmentWindow, { careerSlug, period });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/ingestOfferProbe',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/ingestOfferProbe',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.VACANCY_INGEST_TOKEN || '';
    if (!hasBearer(request, token)) {
      return jsonResponse(401, { error: 'unauthorized' });
    }
    const body = await parseJson(request);

    const sourceRunId = typeof body.sourceRunId === 'string' ? body.sourceRunId : '';
    const capturedAt = typeof body.capturedAt === 'string' ? body.capturedAt : '';
    const careerSlug = typeof body.careerSlug === 'string' ? body.careerSlug : '';
    const careerLabel = typeof body.careerLabel === 'string' ? body.careerLabel : '';
    const period = typeof body.period === 'string' ? body.period : '';
    const subjects = Array.isArray(body.subjects) ? body.subjects : [];

    if (!sourceRunId || !capturedAt || !careerSlug || !period || !subjects.length) {
      return jsonResponse(400, { error: 'payload inválido' });
    }

    const payload = await ctx.runMutation(internal.ingest.ingestOfferProbe, {
      sourceRunId,
      capturedAt,
      careerSlug,
      careerLabel,
      period,
      subjects,
    });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/upsertEnrollmentWindows',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/upsertEnrollmentWindows',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.VACANCY_INGEST_TOKEN || '';
    if (!hasBearer(request, token)) {
      return jsonResponse(401, { error: 'unauthorized' });
    }
    const body = await parseJson(request);
    const source = typeof body.source === 'string' ? body.source : 'unknown';
    const windows = Array.isArray(body.windows) ? body.windows : [];
    if (!windows.length) {
      return jsonResponse(400, { error: 'windows es requerido' });
    }

    const payload = await ctx.runMutation(api.windows.upsertEnrollmentWindows, {
      source,
      windows,
    });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/getScrapeWindowStatus',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/getScrapeWindowStatus',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await parseJson(request);
    const trigger = body.trigger === 'schedule' ? 'schedule' : 'manual';
    const force = body.force === true;
    const payload = await ctx.runQuery(api.windows.getScrapeWindowStatus, { trigger, force });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/closeEnrollmentWindow',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/closeEnrollmentWindow',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.CONVEX_ADMIN_TOKEN || process.env.VACANCY_INGEST_TOKEN || '';
    if (!hasBearer(request, token)) return jsonResponse(401, { error: 'unauthorized' });
    const body = await parseJson(request);
    const windowId = typeof body.windowId === 'string' && body.windowId ? body.windowId : undefined;
    const source = typeof body.source === 'string' && body.source ? body.source : undefined;
    const payload = await ctx.runMutation(api.windows.closeEnrollmentWindow, { windowId, source });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/admin/getStats',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/admin/getStats',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.CONVEX_ADMIN_TOKEN || process.env.VACANCY_INGEST_TOKEN || '';
    if (!hasBearer(request, token)) return jsonResponse(401, { error: 'unauthorized' });
    const payload = await ctx.runQuery(api.admin.getStats, {});
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/admin/resetAllData',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/admin/resetAllData',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.CONVEX_ADMIN_TOKEN || process.env.VACANCY_INGEST_TOKEN || '';
    if (!hasBearer(request, token)) return jsonResponse(401, { error: 'unauthorized' });
    const body = await parseJson(request);
    const confirm = typeof body.confirm === 'string' ? body.confirm : '';
    const payload = await ctx.runMutation(api.admin.resetAllData, { confirm });
    return jsonResponse(200, payload);
  }),
});

router.route({
  path: '/admin/recomputeVacancyCapacity',
  method: 'OPTIONS',
  handler: httpAction(async () => handleOptions()),
});

router.route({
  path: '/admin/recomputeVacancyCapacity',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const token = process.env.CONVEX_ADMIN_TOKEN || process.env.VACANCY_INGEST_TOKEN || '';
    if (!hasBearer(request, token)) return jsonResponse(401, { error: 'unauthorized' });
    const body = await parseJson(request);
    const careerSlug = typeof body.careerSlug === 'string' ? body.careerSlug : '';
    const period = typeof body.period === 'string' ? body.period : '';
    const cursor = typeof body.cursor === 'string' && body.cursor ? body.cursor : undefined;
    const batchSize = typeof body.batchSize === 'number' ? body.batchSize : undefined;
    if (!careerSlug || !period)
      return jsonResponse(400, { error: 'careerSlug y period son requeridos' });
    const payload = await ctx.runMutation(api.admin.recomputeVacancyCapacity, {
      careerSlug,
      period,
      cursor,
      batchSize,
    });
    return jsonResponse(200, payload);
  }),
});

export default router;

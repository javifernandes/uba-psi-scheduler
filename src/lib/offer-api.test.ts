import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getOfferSubjects,
  getVacancyAnalytics,
  getVacancyTrends,
  listCareersWithLatestPeriod,
  listPeriodsByCareer,
} from './offer-api';

const originalEnv = process.env.NEXT_PUBLIC_CONVEX_API_BASE;

describe('offer-api', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_CONVEX_API_BASE = originalEnv;
  });

  it('lista carreras válidas descartando payloads inválidos', async () => {
    process.env.NEXT_PUBLIC_CONVEX_API_BASE = 'https://api.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            slug: 'lic-psicologia',
            label: 'Lic. Psicología',
            latestPeriod: '2026-01',
            subjects: 10,
          },
          { slug: 'bad', label: 'Bad', latestPeriod: 'x', subjects: 1 },
        ],
      })
    );

    const careers = await listCareersWithLatestPeriod();
    expect(careers).toEqual([
      {
        slug: 'lic-psicologia',
        label: 'Lic. Psicología',
        latestPeriod: '2026-01',
        subjects: 10,
      },
    ]);
  });

  it('normaliza períodos válidos de una carrera', async () => {
    process.env.NEXT_PUBLIC_CONVEX_API_BASE = 'https://api.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ['2026-01', '2026/2', 'x'],
      })
    );

    const periods = await listPeriodsByCareer('lic-psicologia');
    expect(periods).toEqual(['2026-01', '2026-02']);
  });

  it('retorna subjects para scheduler cuando API responde array', async () => {
    process.env.NEXT_PUBLIC_CONVEX_API_BASE = 'https://api.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ schemaVersion: 2, id: 'x', label: 'L', header: 'H', slots: [] }],
      })
    );

    const subjects = await getOfferSubjects('lic-psicologia', '2026-01');
    expect(subjects).toHaveLength(1);
    expect(subjects[0]?.id).toBe('x');
  });

  it('retorna payload de analíticas sin transformar', async () => {
    process.env.NEXT_PUBLIC_CONVEX_API_BASE = 'https://api.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lastProbeAt: null,
          totals: {
            knownVacancies: 0,
            sinCupo: 0,
            cupoBajo: 0,
            cupoDisponible: 0,
            sinDatos: 0,
          },
          series: [],
          topDrops: [],
        }),
      })
    );

    const analytics = await getVacancyAnalytics('lic-psicologia', '2026-01', '24h');
    expect(analytics.totals.knownVacancies).toBe(0);
  });

  it('retorna series de tendencia por materia y cátedra', async () => {
    process.env.NEXT_PUBLIC_CONVEX_API_BASE = 'https://api.example.com';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          anchorAt: '2026-03-15T05:00:00.000Z',
          subject: { '10212-810': [40, 35, 30] },
          materia: { '10212': [120, 110, 95] },
        }),
      })
    );

    const trends = await getVacancyTrends('lic-psicologia', '2026-01', '24h');
    expect(trends.subject['10212-810']).toEqual([40, 35, 30]);
    expect(trends.materia['10212']).toEqual([120, 110, 95]);
  });
});

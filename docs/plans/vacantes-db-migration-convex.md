# Plan implementado: DB-only con Convex

Fecha: 2026-03-15

## Decisiones

- Persistencia principal: Convex.
- App frontend: Next.js estático (`output: export`) + fetch HTTP a Convex.
- Routing: `/oferta?career=&period=` y `/oferta/analytics?career=&period=`.
- Ingesta: workflow `probe-offer-convex.yml` cada 15 minutos.
- Datasets scrapeados en repo: eliminados (`src/data/uba/psicologia/oferta`).
- Backfill histórico: script `scripts/backfill-vacancies-from-git.ts`.

## Contratos HTTP

- `POST /listCareersWithLatestPeriod`
- `POST /listPeriodsByCareer`
- `POST /getOfferSubjects`
- `POST /getVacancyAnalytics`
- `POST /ingestOfferProbe` (bearer token)

## Variables de entorno

- `NEXT_PUBLIC_CONVEX_API_BASE`
- `CONVEX_INGEST_URL`
- `VACANCY_INGEST_TOKEN`

## Scripts clave

- `npm run scrape:catalog -- --career all --output-dir ./tmp/probe-data`
- `npm run probe:push-convex -- --input-dir ./tmp/probe-data`
- `npm run backfill:vacancies -- --dry-run`
- `npm run convex:admin -- stats`
- `npm run convex:admin -- reset --confirm DROP_ALL_DATA`

## Observaciones operativas

- El scheduler y analíticas quedan atados a disponibilidad de Convex.
- Los deploys de Pages dejan de depender de updates de vacantes.

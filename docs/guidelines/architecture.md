# Architecture Guidelines

## Product constraints

- The app is currently static-export friendly (`output: 'export'`).
- Runtime dependencies should remain minimal.
- Local persistence is via `localStorage`.
- Oferta y vacantes se consumen vía API HTTP de Convex (DB-only).

## Directory model

- `src/app/oferta/page.tsx`: route entrypoint canónico del scheduler (`/oferta?career=&period=`)
- `src/app/oferta/analytics/page.tsx`: route de analíticas por query params
- `src/components/scheduler/*`: scheduler domain (UI + hooks + utils)
- `src/domain/*`: reglas puras de negocio y transformaciones de datos del scheduler
- `src/components/*`: shared UI or cross-route components
- `src/lib/*`: shared low-level utilities
- `scripts/*`: data ingestion and maintenance scripts
- `convex/*`: schema y lógica backend (queries/mutations/httpActions)

## Evolution policy

- Keep route shape stable around `/oferta?career=&period=` and `/oferta/analytics?...`.
- Keep Convex contracts (`listCareersWithLatestPeriod`, `listPeriodsByCareer`, `getOfferSubjects`, `getVacancyAnalytics`) stable and documented.
- Keep scraper outputs in temporary workspace and avoid git-versioning scraped datasets.

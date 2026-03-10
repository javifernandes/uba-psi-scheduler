# Architecture Guidelines

## Product constraints

- The app is currently static-export friendly (`output: 'export'`).
- Runtime dependencies should remain minimal.
- Local persistence is via `localStorage`.

## Directory model

- `src/app/oferta/[career]/page.tsx`: route entrypoint del scheduler por carrera
- `src/components/scheduler/*`: scheduler domain (UI + hooks + utils)
- `src/domain/*`: reglas puras de negocio y transformaciones de datos del scheduler
- `src/components/*`: shared UI or cross-route components
- `src/lib/*`: shared low-level utilities
- `scripts/*`: data ingestion and maintenance scripts

## Evolution policy

- Do not introduce server-side state or DB access in the scheduler path unless explicitly planned.
- Prefer additive route structure for future careers (e.g. additional subpaths under `oferta`).
- Keep scraper outputs and runtime data formats stable and documented.

# UBA Psi Scheduler

Visualizador de comisiones, teóricos y seminarios para Psicología UBA.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir: `http://localhost:3000/oferta?career=lic-psicologia&period=2026-01`

## Analytics (PostHog)

La integración de PostHog es opcional y funciona solo si configurás variables públicas.

1. Copiá `.env.example` a `.env.local`.
2. Completá:
   - `NEXT_PUBLIC_POSTHOG_KEY`
   - `NEXT_PUBLIC_POSTHOG_HOST` (default: `https://us.i.posthog.com`)

Sin `NEXT_PUBLIC_POSTHOG_KEY`, la app no envía eventos.

## Build estático

```bash
npm run build
```

Genera salida en `out/`.

## Pipeline de oferta hacia Convex

El scraper ya no versiona datasets de oferta en el repo. El flujo recomendado es:

1. scrape a carpeta temporal (`tmp/probe-data`)
2. push a Convex por endpoint HTTP protegido (`/ingestOfferProbe`)

Comando local integrado:

```bash
npm run scrape:catalog -- --career all --output-dir ./tmp/probe-data
npm run probe:push-convex -- --input-dir ./tmp/probe-data --endpoint "$CONVEX_INGEST_URL"
```

## Probar local end-to-end (Convex)

1. Terminal A:

```bash
npx convex dev
```

2. Configurar variables (Terminal B):

```bash
export NEXT_PUBLIC_CONVEX_API_BASE="https://<deployment>.convex.site"
export CONVEX_INGEST_URL="$NEXT_PUBLIC_CONVEX_API_BASE"
export VACANCY_INGEST_TOKEN="dev-ingest-token"
export CONVEX_ADMIN_TOKEN="dev-admin-token"
```

3. Ingestar probe local:

```bash
npm run scrape:catalog -- --career all --output-dir ./tmp/probe-data
npm run probe:push-convex -- --input-dir ./tmp/probe-data
```

Los scripts CLI cargan automáticamente variables desde `.env` y `.env.local`.

En GitHub Actions (`probe-offer-convex.yml`):

- `CONVEX_INGEST_URL` en **Repository Variables** (`vars`).
- `VACANCY_INGEST_TOKEN` en **Repository Secrets** (`secrets`).

4. Verificar estado en Convex:

```bash
npm run convex:admin -- stats
```

5. Drop total de tablas (reset) y volver a seedear:

```bash
npm run convex:admin -- reset --confirm DROP_ALL_DATA
npm run probe:push-convex -- --input-dir ./tmp/probe-data
```

## Migrations y seed en Convex

- **Schema migration**: editar `convex/schema.ts` y aplicar con `npx convex dev` / `npx convex deploy`.
- **Data migration**: crear mutation(s) puntuales en `convex/` y ejecutarlas con `npx convex run ...`.
- **Seed funcional**: usar el mismo pipeline de ingesta (`scrape:catalog` + `probe:push-convex`).
- **Backfill histórico**: `npm run backfill:vacancies -- --dry-run` y luego ejecución real por batches.

Opciones:

```bash
npm run scrape:catalog -- --career all
npm run scrape:catalog -- --career PS,LM
npm run scrape:catalog -- --career lic-psicologia,lic-musicoterapia
npm run scrape:catalog -- --limit 20
npm run scrape:catalog -- --period 2026-01
npm run scrape:catalog -- --min-ratio 0.8
npm run scrape:catalog -- --skip-sanity
npm run scrape:catalog -- --catalog-url http://localhost:8787/Psi/Ope154_.php
```

Migración de datasets existentes a schema v2 (`slots[]`):

```bash
npm run migrate:subject-schema-v2
```

Guardrails:

- Escritura atómica por período (`.staging` + swap) dentro del output temporal.
- Sanity check (default 80%): si una carrera cae por debajo de `subjects_new >= 80% subjects_prev`, el scrape falla y no publica.
- Si una carrera configurada no trae filas/materias, el scrape falla completo.

Salida (default actual):

- `tmp/probe-data/<period>/<career-slug>/materias/*.json`
- `tmp/probe-data/<period>/careers.generated.json`
- `tmp/probe-data/periods.generated.json`

Formato de materias (schema v2):

- `schemaVersion: 2`
- `slots[]` con union tipada (`teo`, `sem`, `prac`)
- slots con `lugar: { anexo, aula }`
- comisiones con `vacantes` y `slotsAsociados[]`

## Ventanas de ejecución

Configuración versionada en:

- `config/scraper-windows.json`

Comandos locales:

```bash
npm run scrape:window:status
npm run scrape:window:close -- --window-id 2026-1c-main
```

## Estructura

- `convex/*`: schema + queries + HTTP actions (DB-only).
- `src/app/oferta/page.tsx`: entrypoint canónico del scheduler con query params.
- `src/app/oferta/analytics/page.tsx`: analíticas de vacantes por carrera/período.
- `src/components/scheduler/*`: módulo UI/estado del scheduler.
- `scripts/scrape-uba-psi-oferta.ts`: scraper para regenerar datos.
- `scripts/push-offer-probe-to-convex.ts`: push de probes scrapeados a Convex.
- `scripts/backfill-vacancies-from-git.ts`: backfill histórico desde commits de git.
- `scripts/scraper-window-control.ts`: utilidades de status/cierre de ventanas de scraping.

## Deploy (Cloudflare Pages)

- Framework: Next.js (static export)
- Build command: `npm run build`
- Output directory: `out`
- Production branch: `main`
- Preview deployments: habilitados para branches/PRs.

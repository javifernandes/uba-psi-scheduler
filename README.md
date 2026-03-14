# UBA Psi Scheduler

Visualizador de comisiones, teóricos y seminarios para Psicología UBA.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir: `http://localhost:3000/oferta/lic-psicologia/2026-01`

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

## Scraper de oferta (todas las carreras)

```bash
npm run scrape:catalog
```

Opciones:

```bash
npm run scrape:catalog -- --career all
npm run scrape:catalog -- --career PS,LM
npm run scrape:catalog -- --career lic-psicologia,lic-musicoterapia
npm run scrape:catalog -- --limit 20
npm run scrape:catalog -- --period 2026-01
npm run scrape:catalog -- --min-ratio 0.8
npm run scrape:catalog -- --skip-sanity
```

Migración de datasets existentes a schema v2 (`slots[]`):

```bash
npm run migrate:subject-schema-v2
```

Guardrails:

- Escritura atómica por período (`.staging` + swap): ante error no se pisa el dataset vigente.
- Sanity check (default 80%): si una carrera cae por debajo de `subjects_new >= 80% subjects_prev`, el scrape falla y no publica.
- Si una carrera configurada no trae filas/materias, el scrape falla completo.

Salida (por defecto):

- `src/data/uba/psicologia/oferta/<period>/<career-slug>/materias/*.json`
- `src/data/uba/psicologia/oferta/<period>/careers.generated.json`
- `src/data/uba/psicologia/oferta/periods.generated.json`

Formato de materias (schema v2):

- `schemaVersion: 2`
- `slots[]` con union tipada (`teo`, `sem`, `prac`)
- comisiones con `vacantes`, `obligRaw` y `slotsAsociados[]`

## Ventanas de ejecución

Configuración versionada en:

- `config/scraper-windows.json`

Comandos locales:

```bash
npm run scrape:window:status
npm run scrape:window:close -- --window-id 2026-1c-main
```

## Estructura

- `src/data/uba/psicologia/oferta`: datasets scrapeados por período y carrera.
- `src/app/oferta/[career]/[period]/page.tsx`: entrypoint canónico del scheduler.
- `src/app/oferta/[career]/page.tsx`: redirect automático al último período disponible para esa carrera.
- `src/components/scheduler/*`: módulo UI/estado del scheduler.
- `scripts/scrape-uba-psi-oferta.ts`: scraper para regenerar datos.
- `scripts/scraper-window-control.ts`: utilidades de status/cierre de ventanas de scraping.

## Deploy (Cloudflare Pages)

- Framework: Next.js (static export)
- Build command: `npm run build`
- Output directory: `out`
- Production branch: `main`
- Preview deployments: habilitados para branches/PRs.

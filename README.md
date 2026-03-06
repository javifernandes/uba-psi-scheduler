# UBA Psi Scheduler

Visualizador de comisiones, teóricos y seminarios para Psicología UBA.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir: `http://localhost:3000/uba/psicologia/oferta/lic-psicologia/scheduler`

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

## Estructura

- `src/app/uba/psicologia/oferta/lic-psicologia/materias`: datos JSON de materias.
- `src/app/uba/psicologia/oferta/lic-psicologia/scheduler/page.tsx`: entrypoint del scheduler.
- `scripts/scrape-uba-psi-oferta.ts`: scraper para regenerar datos.

## Deploy (Cloudflare Pages)

- Framework: Next.js (static export)
- Build command: `npm run build`
- Output directory: `out`
- Production branch: `main`
- Preview deployments: habilitados para branches/PRs.

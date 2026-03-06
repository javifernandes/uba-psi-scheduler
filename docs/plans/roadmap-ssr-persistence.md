# Roadmap: SSR and Persistence

## Context

The project is intentionally static today for cost, reliability, and operational simplicity.
Future backend capabilities should be introduced only when required by concrete product needs.

## Current baseline

- Static export deployment on Cloudflare Pages.
- Branch previews enabled.
- Client-side state in `localStorage`.

## Potential trigger points for backend adoption

- Cross-device sync for saved schedules.
- User accounts and authentication.
- Shared/public schedule links with server ownership.
- Analytics or admin capabilities requiring trusted writes.

## Migration strategy (incremental)

1. Keep the current routes and UI stable.
2. Move from static export to Next runtime (Workers-compatible) only when needed.
3. Introduce authentication first, then persistence entities.
4. Keep preview/prod separation strict during rollout.

## Data model direction (high-level)

- `users`
- `careers`
- `subjects`
- `commissions`
- `enrollments` (per user)

## Risks and mitigations

- Scope creep early:
  - Mitigation: ship only features with clear user demand.
- Data drift between scraped source and app:
  - Mitigation: maintain repeatable scraping workflow and versioned outputs.
- Deployment complexity growth:
  - Mitigation: preserve simple CI gates (lint, test, build) and staged rollout.

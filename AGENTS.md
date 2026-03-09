# AGENTS Instructions for `uba-psi-scheduler`

Before making changes in this repository, read and follow:

1. `docs/guidelines/code-style.md`
2. `docs/guidelines/testing.md`
3. `docs/guidelines/architecture.md`
4. `docs/plans/roadmap-ssr-persistence.md` (when discussing medium/long-term evolution)

## Scope notes

1. Prefer keeping this repository lightweight.
2. Avoid introducing backend/runtime complexity unless explicitly needed.
3. Keep routes, naming, and docs aligned with the current app shape:
   - `/` = home
   - `/oferta/[career]` = scheduler por carrera
   - `src/components/scheduler/*` = módulo principal del scheduler
4. Refactors are expected to be full migrations by default:
   - Do not leave temporary aliases, compatibility exports, or backward-compatible imports unless the user explicitly requests it.
   - Remove deprecated paths/usages in the same refactor pass.

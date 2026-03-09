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

## File Size & Complexity Conventions

1. Treat files over `200-250` lines as a design warning before adding more code.
2. This is especially strict for components and hooks with dense local state/effects/logic.
3. A file with mostly decoupled small top-level helpers can tolerate more size, but still should be reviewed.
4. Any file reaching `500+` lines is critical and must be refactored/split before continuing to grow it.

## Logic Placement Conventions

1. Keep components focused on rendering/composition; avoid embedding dense behavior logic in component bodies.
2. For interaction logic (for example keyboard arrows + enter selection), extract reusable hooks with generic intent-first names such as `useKeyboardNavigation` or `useKeyboardSelection`.
3. Prefer hooks that can serve a broader pattern, not only one hardcoded caller.
4. When logic is pure business/data computation (for example deriving totals from subject slots), extract it to pure domain functions under `src/model/`.
5. Components and hooks should call these domain functions instead of re-implementing business rules inline.

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
   - `/oferta?career=<slug>&period=<YYYY-01|YYYY-02>` = scheduler canónico por carrera/período
   - `/oferta/analytics?career=<slug>&period=<YYYY-01|YYYY-02>` = analíticas de vacantes
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
4. When logic is pure business/data computation (for example deriving totals from subject slots), extract it to pure domain functions under `src/domain/`.
5. If a `useMemo`/`useCallback` closure contains pure business logic (not React orchestration), extract that logic to `src/domain/*` and keep the hook memoization wrapper minimal.
6. Components and hooks should call these domain functions instead of re-implementing business rules inline.
7. If infrastructure logic appears as repeated effects (for example URL sync, event listener lifecycle, timers, storage mirror), extract a reusable hook for that mechanism.
8. Prefer layered hook design: small generic primitives (for example `useEventListener`) composed into specific adapters (for example `useQueryParamState`).
9. Keep domain hooks free of low-level browser orchestration when that can be delegated to infrastructure hooks.

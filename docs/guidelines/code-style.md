# Code Style

## TypeScript/JavaScript

- Prefer top-level arrow functions over `function` declarations.
- Keep functions small and composable.
- Avoid one-use temporary variables when inlining improves readability.
- Prefer pure helpers for data transformations.

## React

- Do not call hooks conditionally.
- Keep state close to where it is used.
- Extract presentational subcomponents when a component gets too large.
- Prefer explicit prop names over implicit object spreading.

## UI/CSS

- Keep visual consistency with current scheduler styles.
- Favor utility classes over custom CSS unless there is repeated complexity.
- Changes to layout must preserve desktop and mobile behavior.

## Imports and paths

- Use `@/` alias for shared imports under `src/`.
- Keep feature-local imports relative when they belong to the same subtree.

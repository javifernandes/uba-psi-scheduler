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
- Keep components light on behavior logic; move non-trivial interaction logic to hooks.
- For common interaction patterns (keyboard navigation, selection flows, etc.), prefer reusable hooks with generic names/intent.

## UI/CSS

- Keep visual consistency with current scheduler styles.
- Favor utility classes over custom CSS unless there is repeated complexity.
- Changes to layout must preserve desktop and mobile behavior.

## Imports and paths

- Use `@/` alias for shared imports under `src/`.
- Keep feature-local imports relative when they belong to the same subtree.

## Domain Logic

- Keep business/data transformations as pure functions.
- Avoid embedding business rules directly in components/hooks when they can live as pure domain helpers.
- Place domain helpers under `src/model/` whenever they represent domain rules or derived business data.

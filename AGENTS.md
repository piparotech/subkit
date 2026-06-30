# subkit — Agent Notes

TanStack Start / React web app. `@piparo/cn-web` + `@piparo/design-tokens` are the styling system.

## TanStack docs

- Reference: https://tanstack.com/llms.txt
- Read it before non-trivial TanStack work, especially when touching TanStack Start routing, loaders, server functions, SSR/streaming, route configuration, file-based route conventions, navigation, search params, or head/error boundaries.
- Also read it when upgrading TanStack packages, debugging framework/runtime behavior, or choosing between TanStack APIs where local examples are unclear.
- For small, purely presentational React changes that do not depend on TanStack behavior, reading it is optional.

## TODO tracking

- If a `TODO.md` exists, check it before starting non-trivial work.
- If your work solves an item, mark it checked and add a short note when helpful.
- If you discover follow-up work, add it as a checkbox item.

## Styling rules

- Prefer `className` utilities and shared `@piparo/cn-web` components over bespoke CSS.
- Use semantic design-token utilities first. Avoid raw numeric Tailwind scale utilities, arbitrary bracket values, or hardcoded hex values in component `className` strings.
- Token values are single-sourced in `@piparo/design-tokens` and exposed through `@piparo/cn-web`.
- Use semantic colors (`bg-background-*`, `text-foreground-*`, `border-border-*`, `bg-action-*`, etc.) or feature-scoped tokens. If a token is missing, add a semantic token/utility instead of encoding the value inline.
- Existing raw classes or bespoke CSS may be migration debt. When touching a file, replace nearby raw values with semantic tokens/components when it is safe and preserves intent.
- Before larger styling work, inspect the target area and make a short migration plan. Do not blindly rename values; map each value to a semantic token or component API.

## Allowed style/CSS escape hatches

Some values are intentionally not className-only:

- Global app shell and prototype-specific CSS in `src/styles/app.css`.
- CSS variables and theme token definitions.
- Dynamic geometry or colors computed at runtime.
- Browser/platform CSS that Tailwind utilities or cn-web components do not express cleanly.

Prefer keeping new feature-scoped raw styling behind semantic CSS variables/classes instead of sprinkling literals through components.

## Design system

- Shared web components live in `@piparo/cn-web`; reuse them before building bespoke components.
- Generic reusable UI belongs in the shared package rather than a feature-local copy when it is broadly useful.
- Prefer optional, non-destructive component extensions: new props, variants, or className slots instead of forks.
- Keep component exports and types in sync when extending shared packages.

## TypeScript

- Never use `any`; prefer `unknown` and narrow it.
- Avoid `as ...` casts; use type guards, narrowing, unions, or constrained generics.
- Never use double assertions like `as unknown as T`.
- `as const` is allowed for literal inference.
- Never prefix function calls with `void`.

## React

- Keep one component per file when practical.
- Name component files after the component in PascalCase.
- Split components that accumulate too many states or responsibilities.
- Prefer self-contained components to avoid unnecessary parent re-renders.

## Git workflow

- Commit only when the user explicitly asks.
- If committing, use Angular-style Conventional Commits: `type(scope): subject`.
- Preferred types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Keep the subject imperative, lowercase, and without a trailing period.

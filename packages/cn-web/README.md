# @piparo/cn-web

shadcn-style **React + Tailwind** web Shell primitives, **token-driven** via `@piparo/design-tokens`.

The Tailwind theme maps to the design-token CSS variables (same base + per-app overrides as native), so components speak only **semantic tokens** — re-brand by swapping the token set, never by editing component code. Web counterpart to `cn-native` (Expo UI + StyleSheet/tokens); see KB **ADR 0016**.

## Dev

- `pnpm --filter @piparo/cn-web dev` — Vite dev server (showroom: `src/App.tsx`)
- `pnpm --filter @piparo/cn-web build` — typecheck + production build
- `pnpm --filter @piparo/cn-web lint` — ESLint (own React flat config)

Requires the token CSS built once: `pnpm --filter @piparo/design-tokens build`.

## Layout

- `src/components/ui/` — Button, Card (shadcn-style, token-driven). More land with the Shell work.
- `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge).
- `tailwind.config.ts` — maps Tailwind theme → `@piparo/design-tokens` CSS vars.
- `src/index.css` — imports `@piparo/design-tokens/css` + Tailwind layers.

Own React/Vite toolchain (excluded from the root ESLint/Prettier; typechecks via the root `pnpm -r typecheck`).

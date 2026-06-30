# cn-web shadcn registry

A shadcn-style component registry for the **web** PUI (React + Tailwind v4), mirroring the cn-native
registry. Consumers install components with `shadcn add` (or `pcn`), getting flat, token-backed source
files plus their dependency closure.

## Build

```sh
node build.mjs                              # derive registry/ + registry.build.json + public/list.json
npx shadcn@latest build registry.build.json # compile public/r/<name>.json (what consumers fetch)
```

`build.mjs` **auto-derives** every item from `src/` rather than a hand-maintained `registry.json`:
per component it collects the files (`PUIX.tsx` + co-located `PUIX.types.ts`), the npm `dependencies`
(from the bare imports), and the `registryDependencies` (from `./PUIY` and `../../lib/*` imports).
Titles/descriptions are reused from `../cn-native/registry.json` where a component matches (same kebab
name), so the two registries stay in sync; web-only items (e.g. `pui-data-table`) carry their own.
Relative imports flatten to `./<basename>`, and `@piparo/design-tokens` CSS imports are rewritten to
the token files copied alongside, so an installed set needs no private `@piparo` packages.

The host for cross-item `registryDependencies` URLs is `REGISTRY_URL` (default `https://cn.piparo.tech/r/`);
override it to build against a local server.

## Items

- `pui-utils` — the `cn()` className merge (clsx + tailwind-merge).
- `pui-display-scale` — `useDisplayScale` / `useApplyDisplayScale` (ADR 0022 web `--ui-scale`).
- `pui-theme-css` — the Tailwind v4 entry (`index.css`) + the token CSS vars + the shared `@theme`.
- `pui-*` — one per component (Button, Dialog, Select, …), with their derived dependency closure.

## Consume

```sh
shadcn add https://cn.piparo.tech/r/pui-button.json
# or against a local build: REGISTRY_URL=http://localhost:4000/r/ node build.mjs && serve public -l 4000
```

`registry/`, `registry.build.json`, and `public/` are generated build artifacts (gitignored).

## Serve

`dockerfile` builds the registry (tokens → derive → `shadcn build`) and serves `public/` via nginx
(`/r/<name>.json`, `/list.json`, `/health`), mirroring the cn-native registry container:

```sh
docker build -f packages/cn-web/dockerfile -t ghcr.io/piparotech/cn-web .   # from the monorepo root
```

CI (`.github/workflows/cn-web-registry.yml`) builds + pushes `ghcr.io/piparotech/cn-web` on changes
to `packages/cn-web/**`. The deploy to **cn.piparo.tech** needs a `pui-web/backend.yaml` infra
manifest plus DNS (mirror the cn-native `pui/backend.yaml`); until that exists the deploy step skips.

# AGENTS.md — @piparo/cn-web

Guardrails for the web component library. Binding. Architecture is in KB `ADR 0016`; this is the day-to-day contract. The native twin `@piparo/cn-native` follows the same rules — **keep parity**.

## What this is

A **library-only** package (no app entry; `main` → `src/index.ts` barrel). shadcn-style React + Tailwind + Radix primitives, token-driven. Components browse in **Storybook** (`pnpm storybook`); integration + modules are shown in **`apps/showcase-web`**. Never add an app entry / `index.html` / `main.tsx` here — the showcase app is the runtime.

## Naming & files

- `PUI*` prefix for every component. **Not** `Themed*`.
- Components in `src/components/ui/`; a Storybook story per component (`*.stories.tsx`); export from `src/index.ts`.
- **Imports must be relative** within the package (`../../lib/utils`). No `@/` alias in shipped component code — it breaks cross-package consumption from the showcase app.

## API conventions

- **Text/label props are `ReactNode`** (i18n-agnostic — string, `t`, or `<Trans>`). The library never imports a catalog.
- `forwardRef` for inputs; controlled `value`/`onChange`.
- Variants/tones are **semantic unions**, never raw color-token strings.

## Theming & tokens

- Style with **Tailwind classes mapped to the token CSS vars** (`bg-primary`, `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `ring-ring`, `bg-destructive`, ...). For tokens without a Tailwind alias (`intent.success/warning`, `foreground.brand`) use arbitrary values: `bg-[var(--color-intent-success-background)]`.
- `ThemeProvider` sets `data-theme` + the `.dark` class so the token vars resolve. Light/dark is theme-driven.
- **Only token-backed classes.** No hardcoded hex/rgb, no arbitrary non-token colors.
- **Sizes are relative and display-bound (ADR 0022), not fixed.** Type, spacing, element sizes, icons and media scale with the viewport within clamped bounds (`clamp` at the root with a rem term so zoom still works); breakpoints + container queries stay the primary responsiveness lever, large viewports change layout rather than scaling forever. User/OS scaling (zoom) is respected and capped per role. Hairlines (1px) and hit targets (≥44px) never scale below their floor. The scale factor lives centrally, never per-component.
- Use Radix primitives for accessible interactive components (checkbox, dialog, ...).
- **Base: shadcn** — components start from the shadcn pattern (copied in, owned + customized here), kept token-driven.
- **Icons:** accept icons as props (slots) — never hardcode an overridable icon. **Lucide** (`lucide-react`) is the default set. App-provided-icon override mechanism: TBD (roadmap, designed together).

## Accessibility (non-negotiable)

- ARIA roles; `aria-invalid` + `aria-describedby` wiring; `role="alert"` for error text.
- `focus-visible:ring-2 focus-visible:ring-ring` on focusables.
- Hit targets ≥ 44px (`min-h-[44px]`).
- `motion-reduce:animate-none` on animations.

## Completeness

- Handle the applicable states: default, hover, focus, disabled, loading, error, empty.
- Every component ships a story (`@storybook/react-vite`, title `PUI/<Group>/<Name>`, `args` default for required props).
- **Parity is tiered (ADR 0023), not maximal.** Primitives (Tier 1): full parity, same `PUI` name + API + token-driven look on both platforms. Native-Controls (Tier 2): API parity (same name + props when both exist), look/behaviour platform-native by design. Composites (Tier 3): parity optional. Platform-exclusive components (web-only or native-only) are allowed; declare the scope (`both | web-only | native-only`) in the component/story and never document a twin that does not exist. Token-only styling and full a11y never loosen, whatever the tier.

## Absolute bans (impeccable)

`border-left`/`border-right` colored accent stripes; gradient text (`background-clip: text`); decorative glassmorphism; the hero-metric template; identical icon-card grids; modal-as-first-thought; em dashes in copy.

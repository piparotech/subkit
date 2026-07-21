# Nimbus migration release evidence

Date: 2026-07-21

## Automated gates

```text
pnpm docs:nimbus-bootstrap:verify
  isolated Astro Check: 0 errors, 0 warnings, 0 hints
  isolated production build: green
  root/nested HTML, .md, .mdx, llms, robots, Pagefind, sitemap, JSON-LD: present

pnpm docs:check
  72 Astro files: 0 errors, 0 warnings, 0 hints
  Nimbus MDX validation: 6 global components, 1 content directory

pnpm docs:lint
  0 errors, 0 warnings, 0 diagnostics

pnpm docs:build
  34 HTML pages built
  Pagefind indexed 33 content pages / 1,740 words
  sitemap-index.xml created

pnpm docs:verify
  33 baseline HTML routes and their .md/.mdx twins verified
  16 agent surfaces verified
  Pagefind, sitemap, 404, JSON-LD, Markdown alternates verified
  7 llms.txt invariants verified
  output budgets and secret/internal-host scan verified
  WCAG contrast pairs: 5.81:1–16.41:1 light, 7.35:1–15.79:1 dark
```

## Production-preview browser evidence

Origin: local production preview at `http://127.0.0.1:4325/`.

- Explicit sidebar contains all task-oriented sections and current-page state.
- Search opens by click and `Control+K`; `Escape` closes it.
- Queries `entitlement`, `contract`, `apple`, and `pending` each returned ten
  Pagefind results from the built site.
- Theme toggle changed `data-mode`, persisted `ui-mode`, and survived reload.
- First Tab focused the skip link; Enter moved focus to `#main-content`.
- Reduced-motion emulation reported
  `prefers-reduced-motion: reduce` and reduced transitions to `0.00001s`.
- Mobile configuration page at 390×844 had no horizontal overflow; desktop
  sidebar was hidden and `Browse documentation` was available.
- Desktop and tablet long-page/table layouts were visually inspected.
- Browser console and page-error checks returned no output.

Screenshots:

- `screenshots/landing-desktop.png`
- `screenshots/landing-mobile.png`
- `screenshots/configuration-table-desktop.png`
- `screenshots/configuration-tablet.png`
- `screenshots/configuration-mobile.png`
- `screenshots/404-desktop.png`

## Public surfaces

- HTML examples: `/`, `/expo/configuration/`, `/404`
- Search: `/pagefind/pagefind.js`
- SEO/discovery: `/sitemap-index.xml`, `/robots.txt`
- Root corpora: `/llms.txt`, `/llms-small.txt`, `/llms-full.txt`
- Topic corpora: `/llms-mobile.txt`, `/llms-backend.txt`,
  `/llms-concepts.txt`, `/llms-api.txt`, `/llms-operations.txt`
- Section indexes: `/start/llms.txt`, `/concepts/llms.txt`, `/expo/llms.txt`,
  `/node/llms.txt`, `/stores/llms.txt`, `/reference/llms.txt`,
  `/operations/llms.txt`
- Twin examples: `/index.md`, `/index.mdx`,
  `/expo/configuration/index.md`, `/expo/configuration/index.mdx`

## Output comparison

| Metric                  | Starlight baseline | Nimbus build |
| ----------------------- | -----------------: | -----------: |
| HTML files              |                 34 |           34 |
| Pagefind bytes          |            751,782 |      755,663 |
| LLM/topic corpus bytes  |            371,121 |      419,389 |
| Complete Nimbus `dist/` |                  — |    3,777,120 |

The LLM increase is intentional: clean per-page twins, five canonical topic
corpora, and seven section indexes now ship from the same content collection.
The full corpus remains approximately 129 KB and below its 180 KB guard.

## Content and dependency audit

- No Starlight import, plugin, package, or lockfile entry remains outside the
  historical baseline evidence.
- Nimbus is exactly pinned to `0.4.0`; Node engine is `>=22.12.0`.
- Registry UI is copied into the repository and its undeclared `astro-icon`
  dependency plus `@/` alias are explicitly configured.
- Only four canonical content files changed, limited to necessary frontmatter,
  component import removal, icon identifiers, and Steps markup. Fachliche
  contracts remain unchanged.
- Raw source twins are byte-identical to their canonical source files.
- Secret scan found no real `sk_sdk`/`sk_srv` key, private key, RFC1918 URL, or
  `.internal` host. Documented `127.0.0.1` development examples are intentional.

## Remaining repository-wide gate

The root `pnpm check` includes docs check, lint, build, and verification. Its final run was green with schema-valid, non-secret test environment values: Prettier, typecheck, 141/141 Vitest files (494 tests), Node SDK, 32 Expo SDK tests, production audit, all Docs gates, production app build, and SmartCoach smoke (`ok: true`).

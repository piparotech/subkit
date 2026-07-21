# M13b completion audit

Date: 2026-07-21

## Objective restated as deliverables

1. Replace Starlight with a single Nimbus/Astro docs app while preserving the
   33 canonical public content pages and their HTML URLs.
2. Ship a project-owned responsive shell with explicit task-oriented
   navigation, Pagefind, SEO, dark mode, accessibility behavior, and a 404.
3. Ship one clean Markdown twin and one byte-identical source twin for every
   published content entry.
4. Ship `/llms.txt`, Small, Full, five topic corpora, seven section indexes,
   robots, sitemap, JSON-LD, and Markdown alternate links from the canonical
   content collection.
5. Preserve all seven security-critical SubKit invariants and the public versus
   internal boundary.
6. Prove bootstrap provenance, exact pre-1.0 pinning, rollback, static deploy,
   URL/output parity, content quality, responsive behavior, and repository-wide
   green gates.
7. Complete all 77 M13b tasks and maintain accurate master-plan totals.

## Prompt-to-artifact checklist

| Requirement                          | Concrete evidence                                                                                               | Result                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Reproducible baseline before cutover | `starlight-output.json`, `capture-baseline.mjs`, `baseline/README.md`                                           | verified                       |
| Auditable Nimbus bootstrap           | `docs:nimbus-bootstrap:verify`, `scripts/fixtures/nimbus-bootstrap/`, `nimbus-bootstrap-evidence.md`            | verified                       |
| Exact Nimbus pin                     | `apps/docs/package.json`: `nimbus-docs: 0.4.0`; lockfile audit                                                  | verified                       |
| Supported/patched Astro              | `astro: 7.1.3`; production audit reports no known vulnerabilities                                               | verified                       |
| No Starlight runtime/plugin          | package, lockfile, config, and source grep; old MJS removed                                                     | verified                       |
| 33 preserved public routes           | `starlight-output.json`; `verify-output.mjs` checks every title, description, canonical, and path               | 33/33                          |
| Explicit IA/sidebar                  | `astro.config.ts`; production accessibility snapshot lists all sections/pages                                   | verified                       |
| Search                               | Pagefind indexes 33 content pages; preview queries `entitlement`, `contract`, `apple`, `pending` return results | verified                       |
| SEO/discovery                        | sitemap, robots, canonical, JSON-LD and alternate assertions in `verify-output.mjs`                             | verified                       |
| Edit links                           | rendered in both docs and custom landing layouts; preview screenshot                                            | verified                       |
| Dark mode                            | toggle updates `data-mode`, persists `ui-mode`, survives reload                                                 | verified                       |
| Responsive shell                     | desktop/tablet/mobile screenshots; no mobile horizontal overflow; compact mobile disclosure                     | verified                       |
| Keyboard/focus/a11y                  | skip-link moves focus to `main`; Ctrl+K/Escape; reduced motion; browser console/errors empty                    | verified                       |
| WCAG color contrast                  | `verify-contrast.mjs`: all core pairs 5.81:1–16.41:1                                                            | verified                       |
| Custom 404                           | `src/pages/404.astro`, built `404.html`, screenshot                                                             | verified                       |
| Markdown twins                       | 33 `index.md`; component residue and minimum-content guards; four former MDX pages manually inspected           | verified                       |
| Source twins                         | 33 `index.mdx`; byte-equality assertion against canonical source                                                | verified                       |
| Root LLM router                      | `llms.txt.ts`; seven invariants before links; guard                                                             | verified                       |
| Full corpus                          | Nimbus `renderCorpusMarkdown()`; 124 KB under 180 KB budget                                                     | verified                       |
| Small corpus                         | explicit 11-page allowlist; 34 KB under 50 KB budget                                                            | verified                       |
| Five topic corpora                   | dynamic topic route; all artifacts and budgets verified                                                         | verified                       |
| Seven section indexes                | dynamic section route; all artifacts verified                                                                   | verified                       |
| Invariants in smallest contexts      | guard requires all seven rules in Small and all five topic corpora                                              | verified                       |
| Determinism                          | SHA-256 manifests identical across consecutive production builds                                                | verified                       |
| Internal links/headings              | `verify-links.mjs` checks all 33 source files                                                                   | verified                       |
| Secret/internal leak guard           | output scan rejects real SubKit keys, private keys, RFC1918 and `.internal` hosts                               | verified                       |
| MIME contract                        | preview headers: HTML, `text/markdown`, `text/mdx`, plain text, JS and XML correct                              | verified                       |
| Deployment/rollback                  | `DEPLOYMENT.md`, frozen baseline and static artifact rollback                                                   | verified                       |
| LLM question utility                 | six question-to-smallest-corpus evaluations in `llm-evaluation.md`                                              | verified                       |
| Output/dependency comparison         | `nimbus-release-evidence.md`                                                                                    | verified                       |
| Central repository gate              | final `pnpm check` with schema-valid non-secret test values                                                     | green                          |
| Root tests                           | 141 files, 494 tests                                                                                            | green                          |
| Node SDK / Expo SDK                  | 1 Node test; 32 Expo tests                                                                                      | green                          |
| Production audit                     | no known vulnerabilities                                                                                        | green                          |
| Production app build                 | full package, client, SSR and Nitro build                                                                       | green                          |
| SmartCoach smoke                     | JSON result `ok: true`                                                                                          | green                          |
| Formatting                           | `pnpm check-format`                                                                                             | green                          |
| M13b plan                            | `14-nimbus-migration.md`                                                                                        | 77/77                          |
| Master totals                        | `docs/plan/README.md`                                                                                           | 798 done / 71 open / 869 total |

## Coverage validation

The URL verifier is not accepted as a proxy for UI behavior: search, theme,
focus, responsive navigation and errors were tested in a production preview.
The build is not accepted as proof of content quality: Markdown component
residue, raw-source identity, internal anchors, output budgets, security patterns
and LLM questions have separate checks. The isolated bootstrap is not accepted
as proof of repository integration: the final root `pnpm check` executed all
project suites after the migration.

## Remaining uncertainty

No M13b requirement remains uncovered. The site was not deployed or published
because the user did not request deployment, push, commit, or PR creation. The
local static production artifact and deployment contract are complete and
verified; publishing is outside the active goal boundary.

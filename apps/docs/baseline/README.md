# Starlight migration baseline

This directory freezes the public output contract before the Nimbus cutover.
It is intentionally small and tracked; generated `dist/` files remain ignored.

## Reproduce

```sh
pnpm docs:check
pnpm docs:build
pnpm docs:baseline:capture
pnpm docs:verify
```

`starlight-output.json` maps every canonical source page to its public route,
built HTML path, frontmatter title/description, HTML title, and canonical URL.
It also records the seven pre-migration LLM artifacts, their byte sizes and
SHA-256 hashes, the sitemap URL set, and Pagefind output size.

`pnpm docs:verify` is the persistent parity gate. It checks that every baseline
HTML route still exists with its title, description, and canonical URL; that
Pagefind, the sitemap, static 404, and baseline LLM outputs exist; and that the
seven security-critical SubKit invariants remain in `/llms.txt`.

## Configuration contract

- Canonical site: `https://docs.subkit.piparo.tech`
- Locale: English root locale
- GitHub: `https://github.com/piparotech/subkit`
- Edit pattern: `https://github.com/piparotech/subkit/edit/main/apps/docs/{path}`
- Status: unpublished preview
- Navigation: explicit, user-task-oriented order from `apps/docs/astro.config.mjs`
- Deployment: static and independent of Console sessions, databases, and OIDC

## Starlight-coupled MDX inventory

| Source                                             | Components to migrate                                          |
| -------------------------------------------------- | -------------------------------------------------------------- |
| `src/content/docs/index.mdx`                       | `Aside`, `Card`, `CardGrid`; Starlight splash/hero frontmatter |
| `src/content/docs/start/quickstart.mdx`            | `Aside`, `Steps`; unused `TabItem`/`Tabs` imports              |
| `src/content/docs/start/choose-an-integration.mdx` | `Aside`, `CardGrid`, `LinkCard`                                |
| `src/content/docs/expo/configuration.mdx`          | `Aside`                                                        |

## Accepted intentional migration deltas

- Nimbus-owned visual shell and project-owned layout/component files.
- Clean Markdown twins at `/<slug>/index.md` and raw source twins at
  `/<slug>/index.mdx` where supported.
- Canonical topic outputs at `/llms-mobile.txt`, `/llms-backend.txt`,
  `/llms-concepts.txt`, `/llms-api.txt`, and `/llms-operations.txt`, replacing
  the temporary Starlight plugin paths under `/_llms-txt/`.
- Additional per-section `/<section>/llms.txt` indexes, `robots.txt`, JSON-LD,
  and Markdown alternate links.

No existing HTML route, canonical title/description, security invariant, or
public content source may disappear as an incidental framework migration.

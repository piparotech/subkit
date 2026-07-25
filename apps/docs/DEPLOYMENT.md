# SubKit docs deployment

The documentation is a static Astro/Nimbus build. It has no runtime dependency
on the SubKit Console, OIDC, a database, or a server session.

## Build and verify

```sh
pnpm docs:check
pnpm docs:lint
pnpm docs:build
pnpm docs:verify
```

Build `apps/docs/dist/` for the `/docs/` base path and package it with
`Dockerfile.docs`. Production serves it at `https://subkit.piparo.tech/docs/`
through the authoritative GitOps Ingress. Preview builds must run the same
checks and preserve the same base path.

## Required host behavior

- Serve `.html` as `text/html; charset=utf-8`.
- Serve `.md` as `text/markdown; charset=utf-8`.
- Serve `.mdx` as `text/mdx; charset=utf-8` when supported; otherwise
  `text/plain; charset=utf-8` is acceptable.
- Serve `.txt` as `text/plain; charset=utf-8`.
- Preserve trailing-slash HTML routes such as `/docs/expo/configuration/`.
- Return the built `404.html` body with HTTP 404 for unknown `/docs/**` paths.
- Do not rewrite `.md`, `.mdx`, `llms*.txt`, `robots.txt`, Pagefind assets, or
  sitemap files to an HTML app shell.
- Cache fingerprinted `/_astro/` and `/pagefind/` assets immutably; revalidate
  HTML, Markdown twins, LLM corpora, robots, and sitemaps on deploy.

## Release evidence

For a release candidate, record URLs for:

- `/docs/`, `/docs/expo/configuration/`, and a missing `/docs/**` URL returning 404;
- `/docs/pagefind/pagefind.js` and one successful search;
- `/docs/sitemap-index.xml` and `/docs/robots.txt`;
- `/docs/llms.txt`, `/docs/llms-small.txt`, `/docs/llms-full.txt`, and all topic corpora;
- `/docs/index.md`, `/docs/index.mdx`, `/docs/expo/configuration/index.md`, and
  `/docs/expo/configuration/index.mdx`.

## Rollback

No database or migration rollback is necessary. Redeploy the last green static
artifact. During the local migration, the frozen Starlight contract is kept in
`apps/docs/baseline/starlight-output.json`; `pnpm docs:verify` prevents an
unintended URL/content-surface cutover.

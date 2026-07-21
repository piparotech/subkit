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

Deploy `apps/docs/dist/` to `https://docs.subkit.piparo.tech`. Preview deploys
must run the same commands and publish the same directory.

## Required host behavior

- Serve `.html` as `text/html; charset=utf-8`.
- Serve `.md` as `text/markdown; charset=utf-8`.
- Serve `.mdx` as `text/mdx; charset=utf-8` when supported; otherwise
  `text/plain; charset=utf-8` is acceptable.
- Serve `.txt` as `text/plain; charset=utf-8`.
- Preserve trailing-slash HTML routes such as `/expo/configuration/`.
- Publish `404.html` as the host's not-found document.
- Do not rewrite `.md`, `.mdx`, `llms*.txt`, `robots.txt`, Pagefind assets, or
  sitemap files to the HTML app shell.
- Cache fingerprinted `/_astro/` and `/pagefind/` assets immutably; revalidate
  HTML, Markdown twins, LLM corpora, robots, and sitemaps on deploy.

## Release evidence

For a release candidate, record URLs for:

- `/`, `/expo/configuration/`, and `/404`;
- `/pagefind/pagefind.js` and one successful search;
- `/sitemap-index.xml` and `/robots.txt`;
- `/llms.txt`, `/llms-small.txt`, `/llms-full.txt`, and all topic corpora;
- `/index.md`, `/index.mdx`, `/expo/configuration/index.md`, and
  `/expo/configuration/index.mdx`.

## Rollback

No database or migration rollback is necessary. Redeploy the last green static
artifact. During the local migration, the frozen Starlight contract is kept in
`apps/docs/baseline/starlight-output.json`; `pnpm docs:verify` prevents an
unintended URL/content-surface cutover.

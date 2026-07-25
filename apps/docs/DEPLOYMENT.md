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

## Pull request preview

`.forgejo/workflows/preview-docs.yml` builds and verifies every pull request,
then uploads a 14-day `subkit-docs-preview-<sha>` Forgejo artifact. The artifact
contains the static site beneath `site/docs/`, the full source commit in
`SOURCE_SHA`, a SHA-256 file manifest, and local serving instructions.

This is deliberately portable review evidence rather than an automatically
hosted review app. Both pull request workflows run only on the repository-scoped
`subkit-pr` lane. Its job containers receive no Docker endpoint, private-registry
credentials, Kubernetes service-account token, repository secrets, or routes to
private, Tailnet, or cloud-metadata address space. Reviewers can download the
artifact from the workflow run and serve it locally:

```sh
python3 -m http.server 4173 --directory site
```

Then open `http://127.0.0.1:4173/docs/`. The artifact smoke covers representative
HTML, Pagefind, LLM output, the production base path, and an unknown-path 404.
The production image smoke remains authoritative for nginx MIME types, response
headers, non-root execution, and read-only-container behavior.

Do not add an automatic privileged `pull_request` deployment. A hosted review
app requires a separately approved GitOps design with all of these properties:

- an isolated namespace and hostname that cannot route production traffic;
- non-production data and independently scoped secrets, never production
  Runtime, OIDC, encryption, registry, or Store credentials;
- immutable commit-SHA images built only after explicit trust approval;
- declarative creation, expiry, and pull-request-close cleanup;
- resource quotas, network policy, observability, and an auditable owner.

Until that contract exists, the short-lived Forgejo artifact is the only PR
preview surface.

## Production deployment

Trusted `main` pushes build, smoke, and publish the coherent dashboard,
migration, and docs image set under one immutable full commit SHA. Production is
updated separately through the manually dispatched SHA-bound GitOps promotion
in the Infra repository. Pull request workflows never publish images or mutate
GitOps.

Image publication is forward-only. A registry or network failure can leave a
partial set after one or two immutable SHA tags were accepted. Never overwrite
or delete those tags as routine recovery, and never promote that SHA. Fix the
cause, create a new release commit without changing the intended application
content (for example, an audited release-evidence commit), rerun the complete
validation and coherent image smoke, then let trusted `main` publish all three
images under the new SHA. The Infra promotion refuses to proceed until the
runtime, migration, and docs manifests all exist and pull as `linux/amd64`; the
abandoned partial tags remain unreferenced evidence rather than mutable state.

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

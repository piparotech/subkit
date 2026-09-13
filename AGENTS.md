# SubKit Clients Agent Notes

This repository contains only consumer-facing SubKit SDKs and public documentation.

## Scope

Allowed:

- `packages/subkit-core`
- `packages/subkit-node`
- `packages/subkit-expo`
- `apps/docs`
- package release, documentation, and consumer verification tooling

Forbidden:

- SubKit service or dashboard implementation
- database schema or migrations
- background workers
- production infrastructure, credentials, or deployment manifests

When a client contract requires server work, change the client contract here and coordinate the server implementation in the private SubKit service repository. Do not copy service code into this repository.

## TypeScript

- Never use `any`; prefer `unknown` and narrow it.
- Avoid type assertions. Use guards, narrowing, unions, or constrained generics.
- Keep public package exports and documentation synchronized.

## Changesets and releases

- Before changing consumer-facing SDK behavior or preparing a release, read [`.changeset/README.md`](.changeset/README.md) and [`docs/releases.md`](docs/releases.md).
- Include a `.changeset/<descriptive-name>.md` with every consumer-visible feature, fix, export or contract change. Write concise English release notes describing consumer impact. Agents may write the Markdown directly instead of using the interactive `pnpm changeset` command.
- Select the affected `@piparotech/subkit-core`, `@piparotech/subkit-node` and/or `@piparotech/subkit-expo` packages. Versions are independent; do not introduce fixed/linked version groups. Private docs and workspace-root packages are not release targets.
- Use `patch` for fixes and `minor` for features. While on 0.x, incompatible changes need at least `minor`, an explicit **BREAKING** note and migration instructions. A move to 1.0 requires a separate decision. Review actual Core peer-dependent bumps; do not suppress them with experimental options.
- Pure docs, tests, formatting or internal refactoring without consumer impact need no changeset. Do not create artificial empty changesets for CI. In the handoff, name the changeset or explain why none is needed.
- Before handoff, run `pnpm changeset:status` and the relevant project gates (`pnpm check` for release readiness). The status script validates all present changesets without a Git-base comparison. Raw `changeset status --since HEAD` is not an equivalent validator.
- Adding notes is implementation work; consuming them and bumping real versions requires an explicit release request. Use `pnpm release:version` from a clean, reviewed and committed worktree; never manually bump package versions or rewrite existing historical changelog sections.
- Release preparation writes `release-plan.json`. Commit the reviewed version/changelog/lockfile/plan changes together as one non-merge release commit directly after its recorded source SHA, only when commits are authorized. Do not mix implementation changes into that commit or hand-edit the selection to bypass checks. Rebase/squash changes to the parent require regenerating the release record.
- Publication uses the existing component-tag GitHub workflow and public npm Trusted Publishing. A tag push triggers publication and requires explicit approval; a main branch push does not publish packages. Never add or run a competing `changeset publish` path. Preserve npmjs public access, OIDC trust, tag/manifest/main-ancestry checks and anonymous clean-consumer verification. For dependent releases, publish and verify Core before pushing Node/Expo tags; concurrency does not enforce ordering.
- Changesets `type: none` entries are not publish targets. Unchanged SDKs must be consumed at their existing registry versions, not republished from newly packed workspace manifests.
- After any ambiguous publish failure, inspect the exact target version before another mutation. Never republish an existing version or automatically retry a partial release; follow `docs/releases.md` for tag-based recovery and read-only metadata/consumer verification. The retired `verify_existing` dispatch input no longer exists. Tags, pushes and remote actions require their own applicable authorization.
- Document required API capabilities, minimum versions and coordinated rollout order. Do not copy private service code, customer information, credentials or internal operator details into SDK changesets or public documentation.

## Git

- Commit only when explicitly requested.
- Use Angular-style Conventional Commits.
- One logical concern per commit.

# Release notes with Changesets

Use Node >=24.12 and pnpm 10.28.0. Changesets CLI is pinned to 3.0.2.

For a consumer-visible change, run `pnpm changeset`, select the affected SDKs,
choose a SemVer bump, and describe the user impact in English. Commit the small
Markdown file with the implementation. Conventional Commits remain useful for
Git, but are not the source of release notes.

```md
---
'@piparotech/subkit-node': patch
---

Return a structured error when the access request times out.
```

One file may cover multiple SDKs. Fixes use patch; features use minor. While on
0.x, incompatible changes use at least minor and an explicit **BREAKING** note
with migration instructions. A move to 1.0 is a separate decision. Core minor
releases automatically require patch releases of its Node/Expo peer dependents;
review the actual release plan rather than forcing fixed versions.

Private docs are not released. Tests, formatting and docs-only changes need no
artificial changeset. Use `pnpm changeset:status` to validate all existing files
without Git-base comparisons; raw `changeset status` has different Git-based
semantics. Empty plans succeed. Unknown/private package names and invalid bump
types fail. Do not describe internal infrastructure, customers or secrets.

Review checklist:

- Does this change affect consumers? If yes, is a changeset included?
- Are all affected SDKs selected, with suitable bump types?
- Does the note explain the effect, migration and required API capability?
- Are rollout order and service/SDK minimum versions explicit where necessary?
- Are package exports, tests and public docs consistent?

See [the release runbook](../docs/releases.md) for version preparation,
publication, exact-commit verification and partial-release recovery.

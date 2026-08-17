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

## Git

- Commit only when explicitly requested.
- Use Angular-style Conventional Commits.
- One logical concern per commit.

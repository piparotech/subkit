# SubKit clients

Consumer-facing SubKit SDKs and public integration documentation.

## Packages

- `@piparotech/subkit-core`: shared contracts, schemas, and Effective Access helpers
- `@piparotech/subkit-node`: trusted backend client
- `@piparotech/subkit-expo`: Expo and React Native purchase and access client

The private SubKit service, dashboard, database, workers, infrastructure, and deployment code are intentionally maintained in a separate internal repository.

## Development

```sh
pnpm install --frozen-lockfile
pnpm check
```

Public documentation lives in `apps/docs/src/content/docs/` and builds under `/docs/`.

## Releases

Changesets manages independent Core, Node and Expo versions and their existing changelogs. Add consumer-facing notes with `pnpm changeset`; inspect them with `pnpm changeset:status`. Prepare a reviewed release with `pnpm release:version`.

Packages publish privately to GitHub Packages from `.github/workflows/release-packages.yml`. The workflow verifies the release selection against its source commit, publishes only selected packages (Core before dependents), then installs all exact manifest versions in a clean consumer. See [the release runbook](docs/releases.md). Publication and component tags require explicit approval.

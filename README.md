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

Packages publish privately to GitHub Packages from `.github/workflows/release-packages.yml`. The workflow publishes Core first, followed by Node and Expo, then installs the exact released versions in a clean consumer.

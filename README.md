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

Packages publish publicly to npmjs.org from `.github/workflows/release-packages.yml` when a component tag is pushed:

- `subkit-core-vX.Y.Z`
- `subkit-node-vX.Y.Z`
- `subkit-expo-vX.Y.Z`

The workflow rejects tags whose version does not match the selected package or whose commit is not contained in `main`. It builds and publishes only the tagged package through npm trusted publishing, verifies both public npm metadata representations, then installs the exact public version in an anonymous clean consumer.

Each npm package trusts only GitHub Actions from organization `piparotech`, repository `subkit`, workflow `release-packages.yml`, with the `npm publish` action. Releases require no npm token or repository secret.

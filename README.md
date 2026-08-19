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

The workflow rejects tags whose version does not match the selected package or whose commit is not contained in `main`. It builds and publishes only the tagged package through npm trusted publishing, then installs the exact public version in an anonymous clean consumer.

### First npmjs publication

Trusted publishing can only be attached after a package exists on npmjs.org. Bootstrap each package once from `main` with the workflow's manual dispatch and the short-lived `NPM_BOOTSTRAP_TOKEN` repository secret. The token must be granular, restricted to the `piparotech` npm organization, permitted to publish public packages, allowed to bypass 2FA, and expire as soon as practical.

After all three packages exist:

1. Configure each npm package's trusted publisher as GitHub Actions, organization `piparotech`, repository `subkit`, workflow `release-packages.yml`, allowed action `npm publish`.
2. Delete the `NPM_BOOTSTRAP_TOKEN` GitHub secret and revoke the npm token.
3. Use component tags on `main` for every later release; do not use the manual bootstrap dispatch again.

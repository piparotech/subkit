# @piparotech/subkit-core

Shared platform-neutral SubKit schemas, DTOs, error contracts, and types used by the Node and Expo SDKs.

## Install

Configure the private piparo.tech Forgejo registry, then install Core with the SDK that consumes it:

```sh
pnpm add @piparotech/subkit-core @piparotech/subkit-node
# or
pnpm add @piparotech/subkit-core @piparotech/subkit-expo
```

Node and Expo declare Core as a required compatible peer dependency. Do not install mismatched versions.

## Documentation

- [Choose an integration](https://subkit.piparo.tech/docs/start/choose-an-integration/)
- [API reference](https://subkit.piparo.tech/docs/reference/api/)
- [Error reference](https://subkit.piparo.tech/docs/reference/errors/)

This package must remain independent of Expo, React Native, server credentials, Drizzle, and application runtime modules.

# @piparotech/subkit-core

Shared platform-neutral SubKit schemas, DTOs, error contracts, and types used by the Node and Expo SDKs.

## Install

Configure the private GitHub Packages registry, then install Core with the SDK that consumes it:

```sh
pnpm add @piparotech/subkit-core @piparotech/subkit-node
# or
pnpm add @piparotech/subkit-core @piparotech/subkit-expo
```

Node and Expo declare Core as a required compatible peer dependency. Do not install mismatched versions.

## Effective Access contract

Core exports `resolveEntitlementAccess(customerInfo, entitlementKey)` and the
`EntitlementAccessDecision` discriminated union. The union has no redundant
access Boolean: `state: 'granted'` is the effective decision, while
`device_blocked` requires a typed recovery reason. Valid branches cannot
represent contradictory states.

App code normally uses the Expo hooks/client rather than calling the resolver
directly. The pure resolver is useful for backend, adapter, and deterministic
contract tests.

## Documentation

- [Choose an integration](https://subkit.piparo.tech/docs/start/choose-an-integration/)
- [API reference](https://subkit.piparo.tech/docs/reference/api/)
- [Error reference](https://subkit.piparo.tech/docs/reference/errors/)

This package must remain independent of Expo, React Native, server credentials, Drizzle, and application runtime modules.

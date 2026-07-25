# @piparotech/subkit-expo

Expo / React Native SDK for SubKit offerings, purchases, restore/sync, CustomerInfo, and entitlement checks. SubKit is the access authority; `expo-iap` is only the native Store adapter.

## Install

Configure the private piparo.tech Forgejo registry, then install Expo with its required Core peer and the optional storage adapters your app uses:

```sh
pnpm add @piparotech/subkit-core@^0.1.8 @piparotech/subkit-expo@^0.1.10
```

## Minimal setup

```ts
import { configureSubKit } from '@piparotech/subkit-expo'

configureSubKit({
  sdkKey: 'sk_sdk_replace_me',
  installationId: persistentInstallationId,
  persistence: { storage: appJsonStorage, keyPrefix: 'my-app.subkit.v1' },
  appUserId: currentUserId,
})
```

Mobile apps use only a public app-bound `sk_sdk_…` key. Keep the installation ID persistent, render package identifiers and native prices from Runtime Offerings, and unlock only from an active SubKit entitlement. A `pending` purchase never grants access.

Public adapters are available at:

- `@piparotech/subkit-expo/expo-iap`
- `@piparotech/subkit-expo/expo-secure-store`
- `@piparotech/subkit-expo/mmkv`
- `@piparotech/subkit-expo/async-storage`

## Documentation

- [Expo overview](https://subkit.piparo.tech/docs/expo/overview/)
- [Installation](https://subkit.piparo.tech/docs/expo/installation/)
- [Configuration and persistence](https://subkit.piparo.tech/docs/expo/configuration/)
- [Purchases](https://subkit.piparo.tech/docs/expo/purchases/)
- [Entitlements and offline behavior](https://subkit.piparo.tech/docs/expo/entitlements/)
- [Troubleshooting](https://subkit.piparo.tech/docs/expo/troubleshooting/)

---
title: Installation
description: Install the SubKit Expo SDK, its core contract, and the expo-iap native adapter.
---

## Packages

```sh
pnpm add @piparotech/subkit-core@^0.1.8 @piparotech/subkit-expo@^0.1.10
```

Install the matching core contract explicitly. The Expo SDK imports its runtime
schemas from that host-provided package and will not auto-install a second
unpublished copy.

## Peer dependencies

The SDK declares these peers — your app provides them:

| Peer            | Why                                                    |
| --------------- | ------------------------------------------------------ |
| `expo`          | Expo runtime                                           |
| `expo-iap`      | Native store adapter (StoreKit / Play Billing)         |
| `react` (>= 18) | Hooks (`useSubKitEntitlement`, `useSubKitIapAutoSync`) |
| `react-native`  | `AppState`, `Platform` defaults                        |

`@react-native-async-storage/async-storage` ships as a regular dependency and
backs the default durable purchase queue and customer-info cache.

```sh
npx expo install expo-iap
```

## Native prerequisites

`expo-iap` contains native code, so purchases do not work in Expo Go:

- Use a **development build** (`npx expo run:ios` / `npx expo run:android`) or
  EAS Build.
- iOS: in-app purchase capability on the app ID; products configured in App
  Store Connect; a sandbox tester account for testing.
- Android: app published to a testing track in Play Console with billing
  permission; license testers for testing.

The SDK loads `expo-iap` lazily — importing `@piparotech/subkit-expo` in a
test or web environment does not immediately require the native module. The
native module is needed the first time a store operation runs.

## Optional: MMKV instead of AsyncStorage

If your app uses `react-native-mmkv`, you can back the purchase queue with it
instead of AsyncStorage — see
[Advanced configuration](/docs/expo/advanced/#custom-queue-storage-mmkv).

## Next

- [Configuration](/docs/expo/configuration/) — set up keys and options.

---
title: Testing
description: Test SubKit integrations deterministically with memory stores, injected adapters, and sandbox purchases.
---

The SDK's injection points exist so tests never need the real store, real
network, or persisted state.

## Deterministic unit tests

Replace the durable pieces with memory implementations and inject a fake
adapter:

```ts compile
import {
  type SubKitIapAdapterBundle,
  configureSubKit,
  createMemoryPurchaseQueueStore,
} from '@piparotech/subkit-expo'

const fakeAdapter: SubKitIapAdapterBundle = {
  iap: {
    async initConnection() {
      return true
    },
    async endConnection() {},
    async fetchProducts() {
      return []
    },
    async getAvailablePurchases() {
      return []
    },
    async requestPurchase() {
      return []
    },
    async finishTransaction() {},
  },
  listeners: {
    addPurchaseErrorListener: () => ({ remove() {} }),
    addPurchaseUpdatedListener: () => ({ remove() {} }),
  },
}

configureSubKit({
  sdkKey: 'sk_sdk_test',
  installationId: 'install_test',
  apiBaseUrl: 'http://127.0.0.1:3010', // plain HTTP allowed for localhost
  adapterBundle: fakeAdapter,
  autoStart: false, // control startup explicitly in tests
  platform: 'ios',
  queue: createMemoryPurchaseQueueStore(),
})
```

Notes:

- `createMemoryPurchaseQueueStore()` keeps queue state in memory — nothing
  persists between tests.
- `autoStart: false` prevents background sync from racing your assertions;
  call `client.start()` when the test needs it.
- `platform` pins platform-dependent behavior instead of relying on
  `Platform.OS`.
- Point `apiBaseUrl` at a local test server or mock; localhost may use plain
  HTTP.

## What to assert

Focus tests on your app's decisions, not the SDK's internals:

- paywall renders only packages with a `storeProduct`,
- every `PurchaseResult` status leads to the right UI state,
- features unlock only when `entitlements[KEY]?.active === true`,
- restore path re-checks entitlements afterward.

## Offline evaluation without a device

`evaluateOfflineCustomerInfo(info, { now })` applies the offline expiry rules
to a `CustomerInfo` value — useful for testing expiry behavior with controlled
clocks:

```ts compile
import { evaluateOfflineCustomerInfo } from '@piparotech/subkit-expo'

const offline = evaluateOfflineCustomerInfo(cachedInfo, { now: Date.now() })
expect(offline.entitlements.pro?.active).toBe(false) // past expiresAt
```

## Sandbox and test purchases

Real end-to-end purchase verification needs the providers' test environments:

- **iOS**: a development build plus a sandbox tester account. Sandbox purchases
  are verified by SubKit with `environment: sandbox` — the signed
  `accessContext` keeps sandbox and production reads separated.
- **Android**: a testing-track build plus license testers in Play Console.

Never put real keys in test fixtures; test SDK keys are still public app-bound
keys, and server keys never appear in app or test code.

Use the provider guides for the full server-side and console setup:

- [Apple App Store setup](/docs/stores/apple/)
- [Google Play setup](/docs/stores/google-play/)

## Next

- [Recipes](/docs/expo/recipes/)

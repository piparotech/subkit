---
title: Advanced configuration
description: Override the purchase queue, CustomerInfo cache, app-state source, adapter bundle, and platform detection.
---

Override defaults only when your app needs custom behavior. Normal setups need
none of this page.

## Full example

```ts compile
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState, Platform } from 'react-native'

import { configureSubKit, createStoredPurchaseQueueStore } from '@piparotech/subkit-expo'
import { createExpoIapAdapter } from '@piparotech/subkit-expo/expo-iap'

configureSubKit({
  sdkKey: 'sk_sdk_replace_me',
  installationId: 'install_abc',
  adapterBundle: createExpoIapAdapter(),
  platform: Platform.OS === 'ios' ? 'ios' : 'android',
  queue: createStoredPurchaseQueueStore({ storage: AsyncStorage }),
  appStateSource: {
    getCurrentState: () => (AppState.currentState === 'active' ? 'active' : 'background'),
    subscribe: (listener) => {
      const subscription = AppState.addEventListener('change', (state) => {
        listener(state === 'active' ? 'active' : state === 'inactive' ? 'inactive' : 'background')
      })
      return { remove: () => subscription.remove() }
    },
  },
  iap: {
    autoSync: true,
    customerInfoStaleAfterMs: 24 * 60 * 60 * 1000,
    nonExpiringEntitlementMaxOfflineAgeMs: 30 * 24 * 60 * 60 * 1000,
  },
})
```

## Why the durable queue exists

Apple and Google redeliver unfinished subscriptions and non-consumables, so the
stores keep those durable for you. The stored queue covers what they don't:

- **iOS consumables** — active-items-only reads mean a lost consumable event
  never comes back; the queue preserves it across restarts.
- **Rejected/failed state** — purchases rejected by SubKit are remembered and
  not retried forever.
- **Retry caps** — finish retries are counted per purchase instead of resetting
  every launch.
- **User attribution** — a queued purchase stays bound to the app user that
  first observed it.
- **Early events** — listener events arriving before identity/network are held
  until sync is possible.

A transaction is finished in the store only after SubKit's runtime API says it
is finishable.

## Custom queue storage (MMKV)

```ts compile
import { createMMKV } from 'react-native-mmkv'

import { createMmkvJsonStorage, createStoredPurchaseQueueStore } from '@piparotech/subkit-expo'

const mmkv = createMMKV({ id: 'subkit' })
const queue = createStoredPurchaseQueueStore({
  storage: createMmkvJsonStorage(mmkv),
})
```

Any storage with the same `getItem` / `setItem` / `removeItem` shape works —
including encrypted implementations for stricter local-data requirements.

## Fully custom queue

A custom `queue` must implement the complete `PurchaseQueueStore` interface:
`enqueue`, `enqueueMany`, `listPending`, `markFailed`, `markFinished`,
`markRejected`, and `markVerified`. The sync coordinator drains all available
store purchases through `enqueueMany`, so persist batches with a single
storage write.

## Custom CustomerInfo cache

The default cache is scoped to SDK key + installation ID + hashed user
identity. Provide your own via `customerInfoCache`, or build one with the
exported helper:

```ts compile
import { createCustomerInfoCacheStore } from '@piparotech/subkit-expo'

const customerInfoCache = createCustomerInfoCacheStore({
  keyPrefix: 'subkit.customerInfo',
  storage: myJsonStorage, // getItem/setItem/removeItem
  policy: { customerInfoStaleAfterMs: 6 * 60 * 60 * 1000 },
})
```

A `CustomerInfoCacheStore` implements `read(appUserId)` and `write(info)`.
Cached data is schema-validated on read; unparsable entries are treated as
missing.

## Other injection points

| Option           | Default                    | Override for                             |
| ---------------- | -------------------------- | ---------------------------------------- |
| `adapterBundle`  | lazy `expo-iap` adapter    | tests, custom native purchase bridge     |
| `appStateSource` | React Native `AppState`    | tests, non-RN environments               |
| `platform`       | React Native `Platform.OS` | forcing `ios`/`android` in tests         |
| `logger`         | silent                     | surfacing SDK warnings into your logging |
| `sessionId`      | generated                  | correlating diagnostics across a session |
| `autoStart`      | `true`                     | manual `start()` control in tests        |

## Next

- [Testing](/docs/expo/testing/)

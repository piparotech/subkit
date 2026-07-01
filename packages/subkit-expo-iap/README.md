# @piparotech/subkit-expo-iap

Private Expo / React Native SDK for SubKit-managed in-app purchases.

SubKit is the entitlement authority. `expo-iap` is only the native store adapter.

## Basic usage

```ts
import { AppState } from 'react-native'
import {
  createExpoIapAdapter,
  createStoredPurchaseQueueStore,
  createSubKitIapClient,
} from '@piparotech/subkit-expo-iap'
import AsyncStorage from '@react-native-async-storage/async-storage'

const adapterBundle = createExpoIapAdapter()

const subkit = createSubKitIapClient({
  adapterBundle,
  apiBaseUrl: 'https://subkit.example.com',
  appId: 'app_123',
  appUserId: 'user_123',
  installationId: 'install_abc',
  platform: 'ios',
  queue: createStoredPurchaseQueueStore({ storage: AsyncStorage }),
  sdkKey: 'runtime_public_key',
  appStateSource: {
    getCurrentState: () => AppState.currentState === 'active' ? 'active' : 'background',
    subscribe: (listener) => {
      const subscription = AppState.addEventListener('change', (state) => {
        listener(state === 'active' ? 'active' : state === 'inactive' ? 'inactive' : 'background')
      })
      return { remove: () => subscription.remove() }
    },
  },
  iap: {
    syncOnAppStart: true,
    syncOnForeground: true,
    syncOnPurchaseEvent: true,
    foregroundMinIntervalMs: 15 * 60 * 1000,
    sessionResumeThresholdMs: 15 * 60 * 1000,
  },
})

await subkit.start()
```

## Purchase flow

```ts
await subkit.identify('user_123')
await subkit.getOfferings()
const result = await subkit.purchasePackage('monthly')
```

The SDK passes SubKit-generated store identity hints to `expo-iap` automatically:

- iOS: `appAccountToken`
- Android: `obfuscatedAccountId`, optional `obfuscatedProfileId`

The app does not pass those values manually.

## Automatic sync

The SDK can sync purchases automatically:

- on app start
- after `identify()`
- when the app returns to foreground after a configured background duration
- after purchase listener events
- during manual restore

Silent sync uses `getAvailablePurchases()` and never calls prompt-prone restore APIs. Manual restore uses `restorePurchases()` explicitly.

## Safety

- Transactions are finished only after SubKit runtime reconcile returns them as finishable.
- Pending purchases are queued durably when a storage-backed queue is provided.
- Ownership conflicts are returned by the runtime API and are not silently transferred.
- Server-side Apple/Google receipt validation is still a later milestone; the current reconcile path records `accepted_unverified` semantics.

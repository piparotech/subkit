# @piparotech/subkit-expo

Private Expo / React Native SDK for SubKit-managed in-app purchases.

SubKit is the entitlement authority. `expo-iap` is only the native store adapter.

## Install

```sh
pnpm add @piparotech/subkit-core@^0.1.8 @piparotech/subkit-expo@^0.1.10
```

Install the matching Core contract explicitly. The Expo SDK imports its runtime schemas from that host-provided package and will not auto-install a second unpublished copy.

## Basic usage

Configure SubKit once at module scope during app startup, then import the shared `client` wherever you need it.

```ts
// src/subkit.ts
import { configureSubKit } from '@piparotech/subkit-expo'

configureSubKit({
  // One public app-bound SDK Key for iOS and Android. Never use a Server API Key here.
  sdkKey: 'sk_sdk_replace_me',
  // Stable id for this app install on this device. A lazy sync/async provider is also accepted.
  installationId: 'install_abc',
  // Queue and CustomerInfo persistence is explicit and independent from the installation-id storage.
  persistence: { storage: appJsonStorage, keyPrefix: 'my-app.subkit.v1' },
  // Optional stable user id from your app/backend/auth system. Purchases require an identified user.
  appUserId: 'user_123',
})
```

Call `configureSubKit(...)` at module level, not inside `useEffect` or a component. The SDK starts automatically and begins syncing purchases with SubKit, so the shared `client` should be ready before paywalls, hooks, or entitlement checks use it. This also avoids reconfiguration on re-renders.

If `client` is used before configuration, it throws.

Required fields are `sdkKey`, `installationId`, and `persistence.storage` for normal host configuration; `appUserId` is optional. Injected test adapter bundles may use explicit in-memory stores. The same app-bound SDK Key is used on iOS and Android. Runtime requests contain no app or environment selector. Apple or Google verification determines the environment of each real purchase. A signed `accessContext` returned after verification binds later CustomerInfo and entitlement reads to that environment. `apiBaseUrl` is optional and defaults to `https://subkit.piparo.tech`; pass it explicitly for local development or self-hosted SubKit deployments.

Create SDK keys from a trusted backend context with a SubKit-issued `sk_srv_…` key carrying the `sdk_keys:write` capability, never from the mobile app:

```sh
curl -X POST https://subkit.example.com/api/server/sdk-keys \
  -H "Authorization: Bearer $SUBKIT_SCOPED_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sdk-key:app_123" \
  -d '{"appId":"app_123","reason":"provision mobile SDK key"}'
```

Issue one SDK Key for the app and use the returned plaintext value once in your mobile configuration. SubKit stores one keyed hash per app in `sdk_keys` plus an encrypted response for an identical idempotent retry; audit evidence contains hashes, never plaintext keys.

If the user logs in later, configure without `appUserId` first, then identify after login:

```ts
import { client } from '@piparotech/subkit-expo'

await client.identify(user.id)
```

## Installation ID and persistence

The installation ID is weak, best-effort local identity—not a Principal, hardware identifier, fingerprint, ownership proof, or security boundary. It may change after reinstall, app-data clearing, backup/restore behavior, or device migration, and a copied ID is not proof that two requests came from the same physical device.

Static provider:

```ts
configureSubKit({
  sdkKey,
  installationId: 'host-persisted-installation-id',
  persistence: { storage: appJsonStorage, keyPrefix: 'my-app.subkit.v1' },
})
```

Expo SecureStore provider:

```ts
import { configureSubKit, createMmkvJsonStorage } from '@piparotech/subkit-expo'
import { createOrGetInstallationId } from '@piparotech/subkit-expo/expo-secure-store'

configureSubKit({
  sdkKey,
  installationId: createOrGetInstallationId({
    storageKey: 'my-app.subkit.installation-id.v1',
  }),
  persistence: {
    keyPrefix: 'my-app.subkit.v1',
    storage: createMmkvJsonStorage(mmkv),
  },
})
```

`configureSubKit()` remains synchronous. The SDK resolves the lazy provider internally through `client.ready()` before native IAP startup. Resolution is single-flight, retries after a failed attempt, and is immutable for that client after success.

Available installation-ID provider subpaths:

- `@piparotech/subkit-expo/expo-secure-store`: device-local SecureStore defaults (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`, no biometric prompt).
- `@piparotech/subkit-expo/mmkv`: MMKV-backed best-effort alternative.
- `@piparotech/subkit-expo/async-storage`: AsyncStorage-backed best-effort alternative.

Install only the provider library your host imports; they are optional peers. The main package export does not implicitly load any provider. Keep Queue/CustomerInfo storage separate from installation-ID storage: changing the asynchronous ID must not rename or orphan the durable purchase queue.

Storage behavior varies by platform and OS policy:

| Event                  | SecureStore                                  | MMKV / AsyncStorage              |
| ---------------------- | -------------------------------------------- | -------------------------------- |
| Normal restart/update  | Normally retained                            | Normally retained                |
| App-data clear         | Lost                                         | Lost                             |
| Uninstall/reinstall    | Platform-dependent; do not promise retention | Normally lost                    |
| Backup/device transfer | Platform/configuration-dependent             | Platform/configuration-dependent |

A storage read error fails closed. SubKit does not mint a replacement ID unless the provider successfully reports that the value is absent.

## Checking whether the user is subscribed

SubKit exposes entitlements, not just a raw `isSubscribed` flag. Your app should check the entitlement your product grants, for example `pro` or `premium`. This keeps your app logic stable even if multiple App Store / Play Store products grant the same access.

```tsx
import { useSubKitEntitlement } from '@piparotech/subkit-expo'

const PRO_ENTITLEMENT = 'pro' // the entitlement key configured in SubKit

export function ProGate() {
  const {
    active: hasPro,
    commerciallyActive,
    blockedReason,
    deviceActivation,
    isLoading,
    refresh,
  } = useSubKitEntitlement(PRO_ENTITLEMENT)

  if (isLoading) {
    return <LoadingState />
  }

  if (hasPro) {
    return <PaidFeatures />
  }

  return <Paywall onPurchaseFinished={refresh} />
}
```

`active` requires both commercial entitlement and current installation access. `commerciallyActive` remains true when the purchase/grant is valid but this installation is blocked; inspect `blockedReason` and `deviceActivation` to render a device-specific recovery state without telling the user their purchase is inactive.

`useSubKitEntitlement(...)` reads the latest known `CustomerInfo` from the configured SubKit singleton and refreshes it on mount when needed. Fresh CustomerInfo includes a short-lived opaque `accessContext` after provider verification; a trusted app backend can forward it to SubKit Server reads. The token binds app, app user and the provider-verified Store environment, and expires independently from offline entitlement visibility. It updates when SDK calls such as `identify()`, `getCustomerInfo()`, restore, foreground sync or purchase sync receive newer customer info. CustomerInfo is persisted per app/install/user and hydrated on restart. A network failure changes the snapshot to `offline` without erasing a previously active entitlement before its known expiry. Use the returned `refresh()` function before access-sensitive actions or after a custom purchase flow if you need to force a fresh server read.

If you need an immediate one-off check outside React, `identify()` and `getCustomerInfo()` still return `CustomerInfo`:

```ts
import { client } from '@piparotech/subkit-expo'

const PREMIUM_ENTITLEMENT = 'premium' // another entitlement key configured in SubKit
const customerInfo = await client.identify('user_123')
const hasPremium = customerInfo.entitlements[PREMIUM_ENTITLEMENT]?.active === true
```

Use the entitlement key/identifier configured in SubKit, not an Offering Package identifier or provider Store Product ID. Package identifiers, Product IDs, prices, billing periods, trials and offers are runtime catalog data.

## Purchase flow

```ts
import { client } from '@piparotech/subkit-expo'

await client.identify('user_123')
const offerings = await client.getOfferings()
const selectedPackage = offerings.current?.packages[0]
if (selectedPackage == null) throw new Error('No purchasable SubKit Offering is available')
const displayPrice = selectedPackage.storeProduct?.displayPrice
const result = await client.purchasePackage(selectedPackage.identifier)
```

`getOfferings()` resolves every configured package against the current native Store catalog. `storeProduct.displayPrice` is the localized price for the exact Apple product or Google base plan that `purchasePackage(...)` will use. A missing `storeProduct` means the configured Store product is not currently purchasable and must not be replaced with a static catalog price.

`purchasePackage(...)` starts the native store purchase and returns the current purchase outcome. Render translated package copy plus native Store prices from the returned Offering, then pass only the selected package's runtime `identifier`. Do not unlock paid features just because this call returned. SubKit entitlements are the source of truth.

Handle every result status and keep thrown errors separate from expected purchase outcomes:

```ts
import { client } from '@piparotech/subkit-expo'

const PRO_ENTITLEMENT = 'pro' // the entitlement key configured in SubKit

async function buySelectedPackage(packageIdentifier: string) {
  try {
    const result = await client.purchasePackage(packageIdentifier)

    switch (result.status) {
      case 'verified': {
        const hasPro = result.customerInfo.entitlements[PRO_ENTITLEMENT]?.active === true

        if (hasPro) {
          // unlock paid access
          return
        }

        // Purchase was verified, but the expected entitlement is not active.
        // Keep access locked and show a confirmation/support state.
        return
      }

      case 'pending': {
        // The store accepted or started the purchase, but SubKit has not
        // confirmed the entitlement yet. This is normal for Expo IAP.
        // Do not unlock yet.
        showPurchasePendingMessage()

        const customerInfo = await client.getCustomerInfo()
        const hasPro = customerInfo.entitlements[PRO_ENTITLEMENT]?.active === true

        if (hasPro) {
          // unlock paid access
        }

        return
      }

      case 'cancelled': {
        // The user cancelled or closed the store sheet.
        // Keep the paywall open; no error toast needed.
        return
      }

      case 'failed': {
        if (result.error.retryable) {
          showRetryablePurchaseError(result.error.message)
        } else {
          showPurchaseUnavailableMessage(result.error.message)
        }

        return
      }
    }
  } catch (error) {
    // Network, store, runtime, or unexpected native error.
    reportPurchaseError(error)
    showPurchaseFailedMessage()
  }
}
```

Purchase result statuses:

- `verified`: SubKit verified the purchase and returned fresh `CustomerInfo`. Check the entitlement before unlocking.
- `pending`: the store purchase was started or accepted, but entitlement confirmation is still pending. Show a pending/confirming state and wait for automatic sync, foreground sync, or a later `getCustomerInfo()` call to show the entitlement as active.
- `cancelled`: the user cancelled the purchase. Treat this as normal user intent, not an app error.
- `failed`: an expected purchase failure, such as missing identity or an unavailable package/product. Use `result.error.retryable` to decide whether to offer a retry.

Some native, network, or runtime failures can throw instead of returning `{ status: "failed" }`, so always wrap purchases in `try`/`catch`.

The current Expo IAP adapter usually returns `pending` after the native purchase request succeeds. Entitlement confirmation happens through SubKit sync. Your app should only unlock after `customerInfo.entitlements[PRO_ENTITLEMENT]?.active === true`.

If the purchase stays pending, the app was reinstalled, or the user changes devices, provide a restore action and check entitlements afterward:

```ts
async function restoreAndCheckAccess() {
  await client.restorePurchases()

  const customerInfo = await client.getCustomerInfo()
  const hasPro = customerInfo.entitlements[PRO_ENTITLEMENT]?.active === true

  if (hasPro) {
    // unlock paid access
  }
}
```

The SDK resolves the native product id and applicable Google base-plan/offer token from the selected SubKit Offering. Host-app code never supplies static Store identifiers, prices, or provider offer tokens. If a configured Google offer is not currently returned as eligible by Play Billing, the purchase fails closed as unavailable instead of silently buying a different offer.

The SDK also passes SubKit-generated store identity hints to `expo-iap` automatically:

- iOS: `appAccountToken`
- Android: `obfuscatedAccountId`, optional `obfuscatedProfileId`

The app does not pass those values manually.

## Advanced configuration

Override defaults only when your app needs custom behavior:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState, Platform } from 'react-native'

import { configureSubKit, createStoredPurchaseQueueStore } from '@piparotech/subkit-expo'
import { createExpoIapAdapter } from '@piparotech/subkit-expo/expo-iap'

configureSubKit({
  adapterBundle: createExpoIapAdapter(),
  apiBaseUrl: 'https://subkit.piparo.tech',
  appUserId: 'user_123',
  installationId: 'install_abc',
  platform: Platform.OS === 'ios' ? 'ios' : 'android',
  queue: createStoredPurchaseQueueStore({ storage: AsyncStorage }),
  sdkKey: 'runtime_public_key',
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
    syncOnAppStart: true,
    syncOnForeground: true,
    syncOnPurchaseEvent: true,
    foregroundMinIntervalMs: 15 * 60 * 1000,
    sessionResumeThresholdMs: 15 * 60 * 1000,
  },
})
```

Advanced options:

- `adapterBundle`: native store adapter. The default uses `expo-iap`. Override it for tests or a custom native purchase bridge.
- `apiBaseUrl`: SubKit runtime API URL. Defaults to `https://subkit.piparo.tech`.
- `sdkKey`: public app-bound SDK Key. SubKit resolves only the app from this bearer token; verified Apple or Google evidence determines Store environment.
- `appStateSource`: foreground/background source. The default uses React Native `AppState`.
- `autoStart`: starts the SDK when `configureSubKit(...)` is called. Defaults to `true`. Override only for custom startup control or tests.
- `iap`: automatic sync and offline-cache behavior. By default, the SDK syncs on app start, foreground, and purchase events; CustomerInfo becomes stale after 24 hours, while non-expiring entitlements remain usable offline for at most 30 days after verification.
- `platform`: store platform. The default uses React Native `Platform.OS` and supports `ios` and `android`.
- `queue`: local purchase queue. The default is a durable SDK-key/install-scoped AsyncStorage queue; each queued purchase retains its own Store evidence. Override it for custom keys, limits, MMKV, encrypted storage, or tests.

## What `createStoredPurchaseQueueStore` does

`createStoredPurchaseQueueStore({ storage })` creates a durable local queue for purchase events that still need to be sent to SubKit and finished in the store.

Apple and Google already redeliver unfinished non-consumable and subscription transactions on later syncs, so the stores themselves keep those purchases durable. The stored queue matters for the state the stores do not keep for you:

- iOS consumables: the SDK reads active items only, so a consumable purchase event that is lost before reconcile would not come back from the store. The durable queue preserves it across app restarts.
- rejected and failed state: purchases rejected by SubKit or repeatedly failing to finish are remembered and are not re-sent or retried forever.
- retry attempts: finish retries are capped per purchase instead of restarting from zero after every app launch.
- user attribution: a queued purchase stays bound to the app user that first observed it, even across restarts and identity switches.
- purchase listener events can arrive before your app is ready to sync them; the queue holds them until identity and network are available.

The queue stores pending purchases locally and retries them on later syncs. A transaction is only finished after SubKit's runtime API says it is finishable.

SubKit uses AsyncStorage by default and scopes its queue and CustomerInfo cache to the app SDK Key plus installation ID. Queue entries retain provider transaction evidence, while Store-backed CustomerInfo is accepted only with an unexpired environment-bound access context issued by SubKit. Normal setup requires no queue configuration. Override the queue only when you need a custom key/size policy, encrypted storage, or another storage engine.

For example, an app using MMKV can wrap it with the built-in adapter:

```ts
import { MMKV } from 'react-native-mmkv'

import { createMmkvJsonStorage, createStoredPurchaseQueueStore } from '@piparotech/subkit-expo'

const mmkv = new MMKV({ id: 'subkit' })
const queue = createStoredPurchaseQueueStore({
  storage: createMmkvJsonStorage(mmkv),
})
```

The default durable queue preserves rejected/failed markers, retry counts, user attribution, and iOS consumable purchase events across app restarts. Apps with stricter local-data requirements can provide an encrypted storage implementation with the same `getItem` / `setItem` / `removeItem` shape. Tests can explicitly pass `createMemoryPurchaseQueueStore()` when persistence is undesirable.

A fully custom `queue` must implement the complete `PurchaseQueueStore` interface: `enqueue`, `enqueueMany`, `listPending`, `markFailed`, `markFinished`, `markRejected`, and `markVerified`. The sync coordinator drains all available store purchases through `enqueueMany`, so implementations should persist a batch with a single storage write instead of one write per purchase.

## Automatic sync

The SDK can sync purchases automatically:

- on app start
- after `identify()`
- when the app returns to foreground after a configured background duration
- after purchase listener events
- during manual restore

Silent sync uses `getAvailablePurchases()` and never calls prompt-prone restore APIs. Manual restore uses `restorePurchases()` explicitly.

## Offline CustomerInfo

The default AsyncStorage cache is scoped to the selected SDK key, installation ID, Store environment, and a hashed app-user identity. On startup the SDK publishes cached CustomerInfo before network sync completes. An expired `accessContext` is removed from cached/offline CustomerInfo even when the entitlement itself remains usable within its offline policy.

- Expiring entitlements remain active offline only until their server-provided `expiresAt`.
- Non-expiring entitlements remain active for at most `nonExpiringEntitlementMaxOfflineAgeMs` after `verifiedAt` (30 days by default).
- Cache age beyond `customerInfoStaleAfterMs` (24 hours by default) sets `freshness: "stale"` but does not itself revoke access.
- A failed refresh with cached data sets the singleton state and CustomerInfo freshness to `offline`; the error remains available for UI/diagnostics.
- Apps with stricter requirements can lower these limits or provide their own `customerInfoCache` implementation.

## Safety

- Transactions are finished only after SubKit runtime reconcile returns them as finishable.
- Pending purchases are queued durably when a storage-backed queue is provided.
- Queued purchases are scoped to the app user that first observed them; switching identities does not reconcile one user's pending purchases under another user.
- Ownership conflicts are returned by the runtime API and are not silently transferred.
- Purchases are accepted and returned as finishable only after provider-side verification. Missing credentials, unsupported providers, and verification failures fail closed.

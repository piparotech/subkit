---
title: Restore & sync
description: Manual restore, automatic sync triggers, sync reasons, and the useSubKitIapAutoSync hook.
---

The SDK keeps SubKit and the native store reconciled through **silent
automatic sync** plus an **explicit restore** action for user-initiated
recovery.

## Automatic sync

With default configuration, the SDK syncs purchases:

- on app start,
- after `identify()`,
- when the app returns to foreground after a configured background duration
  (`sessionResumeThresholdMs`, throttled by `foregroundMinIntervalMs`),
- after purchase listener events,
- during manual restore.

Silent sync uses the store's `getAvailablePurchases()` and never calls
prompt-prone restore APIs — users see no login sheets from background syncs.

All triggers are configurable via the `iap` options — see
[Configuration](/docs/expo/configuration/#iap-options).

## Manual restore

Provide a restore action for reinstalls, device changes, and stuck pending
purchases. Restore may prompt the user (store login), so it belongs behind an
explicit button:

```ts compile
import { client } from '@piparotech/subkit-expo'

const PRO = 'pro'

async function restoreAndCheckAccess() {
  await client.restorePurchases()

  const access = await client.getAccess(PRO)
  if (access.state === 'granted') unlockPaidAccess()
  else if (access.state === 'device_blocked') showDeviceRecovery(access.reason)
  else showNothingToRestore()
}
```

`restorePurchases()` calls the native restore API, then forces a
`manual_restore` sync and returns the `PurchaseSyncResult` (or `null` when
there was nothing to reconcile).

## Manual sync

`syncPurchases({ reason, force? })` triggers a sync directly. Every sync
carries one of these reasons, which SubKit receives as diagnostic context:

| Reason              | Used for                             |
| ------------------- | ------------------------------------ |
| `app_start`         | Startup sync                         |
| `foreground`        | Return to foreground                 |
| `identity_changed`  | After `identify()`                   |
| `purchase_event`    | Purchase listener events             |
| `manual_restore`    | Explicit restore                     |
| `paywall_preflight` | Fresh state before showing a paywall |
| `queue_retry`       | Retrying queued purchases            |

```ts compile
await client.syncPurchases({ reason: 'paywall_preflight' })
```

Pass `force: true` to bypass throttling.

## The auto-sync hook

For apps that disable `syncOnAppStart` or want the sync tied to a specific
screen mount:

```tsx compile
import { useSubKitIapAutoSync } from '@piparotech/subkit-expo'

export function AppRoot() {
  useSubKitIapAutoSync() // one app_start sync on first mount
  return <AppNavigation />
}
```

Options: `enabled`, `syncOnMount`, and a `logger` with `warn` for sync
failures. The hook guards against duplicate syncs across re-renders.

## What a sync returns

`PurchaseSyncResult` contains `acceptedPurchases`, `rejectedPurchases`,
`conflicts`, `finishableTransactions`, `verificationStatus`, `checkedAt`, and
fresh `customerInfo`. Do not interpret it into access yourself; read
`getAccess(key)` or the access hook after restore. Transactions are finished in
the store **only after** SubKit returns them as finishable — see
[Ownership & unclaimed](/docs/expo/conflicts/) for the conflict cases.

## Next

- [Offline access](/docs/expo/offline/)

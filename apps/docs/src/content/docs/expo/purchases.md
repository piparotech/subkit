---
title: Making purchases
description: Run purchases and handle every outcome — verified, pending, cancelled, failed — plus thrown errors.
---

`purchasePackage(packageIdentifier)` starts the native store purchase and
returns a discriminated union. Handle **every** status, and never unlock just
because the call returned.

## The result union

```ts compile
type PurchaseResult =
  | { status: 'cancelled' }
  | { status: 'pending'; purchaseId: string }
  | { status: 'verified'; customerInfo: CustomerInfo }
  | { status: 'failed'; error: SubKitSerializableError }
```

`SubKitSerializableError` carries `code`, `message`, `retryable`, and optional
`metadata`.

## A complete handler

```ts compile
import { client } from '@piparotech/subkit-expo'

async function buySelectedPackage(packageIdentifier: string) {
  try {
    const result = await client.purchasePackage(packageIdentifier)

    switch (result.status) {
      case 'verified': {
        const access = await client.getAccess('pro')
        if (access.state === 'granted') {
          unlockPaidAccess()
          return
        }
        // Verified commerce evidence can still resolve to inactive, missing,
        // or device recovery. Keep access locked and render that decision.
        showVerifiedWithoutEntitlement()
        return
      }

      case 'pending': {
        // The store accepted or started the purchase, but SubKit has not
        // confirmed the entitlement yet. Normal for Expo IAP. Do not unlock.
        showPurchasePendingMessage()

        const access = await client.getAccess('pro')
        if (access.state === 'granted') unlockPaidAccess()
        return
      }

      case 'cancelled': {
        // User closed the store sheet. Keep the paywall open; no error toast.
        return
      }

      case 'failed': {
        if (result.error.metadata?.purchaseMayHaveCompleted === true) {
          showPurchaseRecovery(result.error)
          return
        }
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

## What each status means

- **`verified`** — SubKit verified the purchase server-side and returned fresh
  `CustomerInfo`. Still check the entitlement before unlocking: a verified
  purchase for a different product does not grant your entitlement.
- **`pending`** — the common outcome with the Expo IAP adapter. Entitlement
  confirmation happens through SubKit sync (automatic, foreground, or a later
  `syncPurchases({ force: true, reason: 'queue_retry' })`). Show a confirming
  state and block repeat purchase. `getAccess()` reads access but does not
  resume queued receipts.
- **`cancelled`** — user intent, not an error. Store-sheet cancellations are
  detected from the native error and normalized to this status.
- **`failed`** — an expected domain failure. Known codes include:

  | Code                  | Meaning                                                                          | Retryable |
  | --------------------- | -------------------------------------------------------------------------------- | --------- |
  | `missing_identity`    | No `appUserId` — identify before purchasing                                      | no        |
  | `product_unavailable` | Package unknown, no store product for this platform, or no eligible Google offer | no        |
  | `store_unavailable`   | Native store error without a specific code                                       | yes       |

A terminal verification rejection can happen after a Store charge. Such failures
carry `error.metadata.purchaseMayHaveCompleted: true`; keep the purchase
blocked and offer reconciliation or support instead of another purchase.
Ownership conflicts include `error.metadata.resolution`. After a native Store
response, transport exceptions during reconciliation return `pending`, never
`cancelled` or a safe-to-retry purchase failure.

## Throws still happen

Some native, network, or runtime failures throw instead of returning
`{ status: 'failed' }`. Always wrap purchases in `try`/`catch`.

## What the SDK resolves for you

The SDK resolves the package's native product ID and Google offer token. If an
optional catalog trial is ineligible, it may use only the bound regular base
plan and shows that Store price. Other offers **fail closed** as
`product_unavailable`; no other base plan or promotion is substituted. Store
identity hints (`appAccountToken`, `obfuscatedAccountId`) are attached.

## Consumables

Apple and Google redeliver unfinished subscriptions and non-consumables on
later syncs. iOS **consumables** do not come back from the store once lost —
the SDK's durable queue preserves consumable purchase events across app
restarts until SubKit reconciles them. This is a key reason not to replace the
default queue with a memory queue in production. See
[Advanced configuration](/docs/expo/advanced/).

## Next

- [Checking effective access](/docs/expo/entitlements/)
- [Restore & sync](/docs/expo/restore-and-sync/)

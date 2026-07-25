---
title: Making purchases
description: Run purchases and handle every outcome — verified, pending, cancelled, failed — plus thrown errors.
---

`purchasePackage(packageIdentifier)` starts the native store purchase and
returns a discriminated union. Handle **every** status, and never unlock just
because the call returned.

## The result union

```ts
type PurchaseResult =
  | { status: 'cancelled' }
  | { status: 'pending'; purchaseId: string }
  | { status: 'verified'; customerInfo: CustomerInfo }
  | { status: 'failed'; error: SubKitSerializableError }
```

`SubKitSerializableError` carries `code`, `message`, `retryable`, and optional
`metadata`.

## A complete handler

```ts
import { client } from '@piparotech/subkit-expo'

const PRO = 'pro' // the entitlement key configured in SubKit

async function buySelectedPackage(packageIdentifier: string) {
  try {
    const result = await client.purchasePackage(packageIdentifier)

    switch (result.status) {
      case 'verified': {
        const hasPro = result.customerInfo.entitlements[PRO]?.active === true
        if (hasPro) {
          unlockPaidAccess()
          return
        }
        // Verified, but the expected entitlement is not active. Keep access
        // locked and show a confirmation/support state.
        showVerifiedWithoutEntitlement()
        return
      }

      case 'pending': {
        // The store accepted or started the purchase, but SubKit has not
        // confirmed the entitlement yet. Normal for Expo IAP. Do not unlock.
        showPurchasePendingMessage()

        const info = await client.getCustomerInfo()
        if (info.entitlements[PRO]?.active === true) {
          unlockPaidAccess()
        }
        return
      }

      case 'cancelled': {
        // User closed the store sheet. Keep the paywall open; no error toast.
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

## What each status means

- **`verified`** — SubKit verified the purchase server-side and returned fresh
  `CustomerInfo`. Still check the entitlement before unlocking: a verified
  purchase for a different product does not grant your entitlement.
- **`pending`** — the common outcome with the Expo IAP adapter. Entitlement
  confirmation happens through SubKit sync (automatic, foreground, or a later
  `getCustomerInfo()`). Show a confirming state.
- **`cancelled`** — user intent, not an error. Store-sheet cancellations are
  detected from the native error and normalized to this status.
- **`failed`** — an expected domain failure. Known codes include:

  | Code                  | Meaning                                                                          | Retryable |
  | --------------------- | -------------------------------------------------------------------------------- | --------- |
  | `missing_identity`    | No `appUserId` — identify before purchasing                                      | no        |
  | `product_unavailable` | Package unknown, no store product for this platform, or no eligible Google offer | no        |
  | `store_unavailable`   | Native store error without a specific code                                       | yes       |

## Throws still happen

Some native, network, or runtime failures throw instead of returning
`{ status: 'failed' }`. Always wrap purchases in `try`/`catch`.

## What the SDK resolves for you

From the selected package, the SDK resolves the native product ID for the
current platform and the applicable Google base-plan/offer token. If a
configured Google offer is not currently returned as eligible by Play Billing,
the purchase **fails closed** as `product_unavailable` instead of silently
buying a different offer. Store identity hints (`appAccountToken`,
`obfuscatedAccountId`) are attached automatically.

## Consumables

Apple and Google redeliver unfinished subscriptions and non-consumables on
later syncs. iOS **consumables** do not come back from the store once lost —
the SDK's durable queue preserves consumable purchase events across app
restarts until SubKit reconciles them. This is a key reason not to replace the
default queue with a memory queue in production. See
[Advanced configuration](/docs/expo/advanced/).

## Next

- [Checking entitlements](/docs/expo/entitlements/)
- [Restore & sync](/docs/expo/restore-and-sync/)

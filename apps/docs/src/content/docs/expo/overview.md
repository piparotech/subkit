---
title: Expo / React Native
description: How the SubKit Expo SDK is structured and where to find each integration task.
---

The `@piparotech/subkit-expo` SDK integrates in-app purchases and access into
Expo / React Native apps. SubKit is the entitlement authority; `expo-iap` is
only the native store adapter.

## Architecture

```text
Your app
  └── @piparotech/subkit-expo   (client, hooks, queue, cache)
        ├── expo-iap             (native store adapter: StoreKit / Play Billing)
        └── SubKit Runtime API   (offerings, customer info, purchase reconcile)
```

The SDK drives the native purchase through `expo-iap`, sends verified evidence
to the SubKit Runtime API, and publishes the resulting `CustomerInfo` to your
app. Transactions are finished only after SubKit says they are finishable.
Access is never derived from a client-side claim.

## What the client exposes

One configured singleton (`client`) with a small surface:

| Method                         | Purpose                                            |
| ------------------------------ | -------------------------------------------------- |
| `identify(appUserId)`          | Bind the install to a known app user               |
| `getAccess(key, appUserId?)`   | Read one effective, impossible-state-safe decision |
| `hasAccess(key, appUserId?)`   | Read a fail-closed Boolean access decision         |
| `getCustomerInfo(appUserId?)`  | Read advanced diagnostic and recovery details      |
| `getOfferings({ placement? })` | Load purchasable packages with live store prices   |
| `purchasePackage(packageId)`   | Run a native purchase for a runtime package        |
| `restorePurchases()`           | Explicit restore for reinstalls and device changes |
| `syncPurchases({ reason })`    | Trigger a purchase sync manually                   |
| `start()` / `stop()`           | Lifecycle control (automatic by default)           |

The primary React gates are `useSubKitAccess(key)` and
`useSubKitHasAccess(key)`, plus `useSubKitOfferings()` and
`useSubKitIapAutoSync()` — see the [hooks reference](/docs/expo/hooks/).

## Section map

Work through these in order for a first integration:

1. [Installation](/docs/expo/installation/) — packages, peer dependencies, native prerequisites.
2. [Configuration](/docs/expo/configuration/) — keys, installation ID, options, lifecycle.
3. [Identifying users](/docs/expo/identity/) — anonymous to identified, `identify()`.
4. [Offerings & paywalls](/docs/expo/offerings/) — render packages with live store prices.
5. [Making purchases](/docs/expo/purchases/) — handle all four purchase outcomes.
6. [Checking effective access](/docs/expo/entitlements/) — one canonical decision for feature gates.
7. [React hooks](/docs/expo/hooks/) — the complete hook reference.
8. [Restore & sync](/docs/expo/restore-and-sync/) — restore, auto-sync, sync reasons.
9. [Offline access](/docs/expo/offline/) — cache freshness and offline policy.

For hardening and production:

- [Ownership & unclaimed purchases](/docs/expo/conflicts/)
- [Error handling](/docs/expo/error-handling/)
- [Advanced configuration](/docs/expo/advanced/)
- [Testing](/docs/expo/testing/)
- [Recipes](/docs/expo/recipes/)
- [Troubleshooting](/docs/expo/troubleshooting/)

## The rules that never change

- Name an **entitlement**, never a subscription, package, or store-product ID.
- Never reconstruct access from raw CustomerInfo fields. Unlock only from
  `access.state === 'granted'` or `useSubKitHasAccess(key)`.
- Never ship a server key (`sk_srv_…`) in the app.
- Prices, product IDs, and offer tokens come from the runtime offering — never
  from constants.

New to SubKit? Start with the [Quickstart](/docs/start/quickstart/) for the smallest
end-to-end path, then return here for depth.

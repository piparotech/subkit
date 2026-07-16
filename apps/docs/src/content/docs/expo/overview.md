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
| `getCustomerInfo(appUserId?)`  | Read the effective access state                    |
| `getOfferings({ placement? })` | Load purchasable packages with live store prices   |
| `purchasePackage(packageId)`   | Run a native purchase for a runtime package        |
| `restorePurchases()`           | Explicit restore for reinstalls and device changes |
| `syncPurchases({ reason })`    | Trigger a purchase sync manually                   |
| `start()` / `stop()`           | Lifecycle control (automatic by default)           |

Plus three React hooks: `useSubKitEntitlement(key)`, `useSubKitOfferings()`,
and `useSubKitIapAutoSync()` — see the [hooks reference](/expo/hooks/).

## Section map

Work through these in order for a first integration:

1. [Installation](/expo/installation/) — packages, peer dependencies, native prerequisites.
2. [Configuration](/expo/configuration/) — keys, installation ID, options, lifecycle.
3. [Identifying users](/expo/identity/) — anonymous to identified, `identify()`.
4. [Offerings & paywalls](/expo/offerings/) — render packages with live store prices.
5. [Making purchases](/expo/purchases/) — handle all four purchase outcomes.
6. [Checking entitlements](/expo/entitlements/) — hook and imperative reads.
7. [React hooks](/expo/hooks/) — the complete hook reference.
8. [Restore & sync](/expo/restore-and-sync/) — restore, auto-sync, sync reasons.
9. [Offline access](/expo/offline/) — cache freshness and offline policy.

For hardening and production:

- [Ownership & unclaimed purchases](/expo/conflicts/)
- [Error handling](/expo/error-handling/)
- [Advanced configuration](/expo/advanced/)
- [Testing](/expo/testing/)
- [Recipes](/expo/recipes/)
- [Troubleshooting](/expo/troubleshooting/)

## The rules that never change

- Check **entitlements**, never subscription, package, or store-product IDs.
- Never unlock before `entitlements[KEY]?.active === true`.
- Never ship a server key (`sk_srv_…`) in the app.
- Prices, product IDs, and offer tokens come from the runtime offering — never
  from constants.

New to SubKit? Start with the [Quickstart](/start/quickstart/) for the smallest
end-to-end path, then return here for depth.

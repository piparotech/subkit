---
'@piparotech/subkit-expo': patch
---

`getOfferings` on iOS now finds the store product of a one-time package that App Store Connect sells as a non-renewing subscription. StoreKit reports those products as `subs`, so the previous `in-app` query left their package without a `storeProduct`, and a paywall that drops unpriced packages hid them. One-time packages on iOS are now queried with the `all` product type. Android keeps the `in-app` query.

Custom adapters receive the new `SubKitIapProductQueryType` (`'in-app' | 'subs' | 'all'`) in `fetchProducts` and must return matching products of either type for `all`. The bundled expo-iap adapter forwards `all` to expo-iap, which supports it.

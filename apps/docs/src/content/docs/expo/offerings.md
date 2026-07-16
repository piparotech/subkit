---
title: Offerings & paywalls
description: Load offerings, render packages with live store prices, and never fall back to static catalog values.
---

`getOfferings()` resolves every configured package against the current native
store catalog. Your paywall renders translated package copy plus **native store
prices** from the response, and passes only the selected package's runtime
`identifier` to the purchase call.

## Load offerings

```ts
import { client } from '@piparotech/subkit-expo'

const offerings = await client.getOfferings()
const current = offerings.current // the default offering, or null
const all = offerings.all // every offering configured for this app
```

Target a specific placement when your app has more than one paywall surface:

```ts
const offerings = await client.getOfferings({ placement: 'settings_upgrade' })
```

## The response shape

Each offering contains packages; each package resolves a `storeProduct` from
the native store:

```ts
for (const pkg of offerings.current?.packages ?? []) {
  pkg.identifier // runtime package ID — pass this to purchasePackage(...)
  pkg.storeProduct?.displayPrice // localized price for the exact store product
  pkg.storeProduct?.currency
  pkg.storeProduct?.title
}
```

`storeProduct.displayPrice` is the localized price for the exact Apple product
or Google base plan that `purchasePackage(...)` will buy.

## Missing `storeProduct` means not purchasable

A package with `storeProduct: null` means the configured store product is not
currently purchasable on this device. **Do not** substitute a static catalog
price and do not offer the package for purchase:

```tsx
function PaywallPackage({ pkg }: { pkg: SubKitOfferingPackage }) {
  if (pkg.storeProduct == null) {
    return null // hide, or show an "unavailable" state — never a fake price
  }
  return <PurchaseRow label={pkg.storeProduct.title} price={pkg.storeProduct.displayPrice} />
}
```

```ts
import type { SubKitOfferingPackage } from '@piparotech/subkit-expo'
```

## The hook: `useSubKitOfferings`

In React components, prefer the hook over manual `useEffect` wiring. It loads
on mount, tracks loading/refresh state, and guards against out-of-order
responses:

```tsx
import { useSubKitOfferings } from '@piparotech/subkit-expo'

export function Paywall({ onPurchased }: { onPurchased: () => void }) {
  const { current, isLoading, error, refresh } = useSubKitOfferings({
    placement: 'settings_upgrade',
  })

  if (isLoading) return <PaywallSkeleton />
  if (error != null) return <PaywallError onRetry={refresh} />
  if (current == null) return <PaywallUnavailable />

  const purchasable = current.packages.filter((pkg) => pkg.storeProduct != null)
  if (purchasable.length === 0) return <PaywallUnavailable />

  return (
    <PackageList
      packages={purchasable}
      onSelect={(pkg) => runPurchase(pkg.identifier, onPurchased)}
    />
  )
}
```

`runPurchase` handles the four purchase outcomes — see
[Making purchases](/expo/purchases/).

### Result and options

```ts
const {
  current, // SubKitOffering | null — the default offering
  offerings, // SubKitOfferingsResponse | null — full response (current + all)
  isLoading, // first load running, no data yet
  isRefreshing, // data present, reload running
  error, // Error | null
  refresh, // () => Promise<SubKitOfferingsResponse | null>
} = useSubKitOfferings({
  placement: 'settings_upgrade', // optional placement filter
  enabled: true, // set false to defer loading (e.g. until the paywall opens)
})
```

Changing `placement` reloads automatically. Call `refresh()` after events that
can change eligibility — for example a completed purchase or `identify()`.
Store prices come from the native store, so a paywall that stays mounted for a
long time can also `refresh()` on foreground.

See the [hooks reference](/expo/hooks/) for all React APIs.

## Optional: preflight sync

Before showing a high-stakes paywall you can force a purchase sync so the
paywall reflects any purchase that completed outside the app:

```ts
await client.syncPurchases({ reason: 'paywall_preflight' })
```

## Rules

- Pass only `package.identifier` to `purchasePackage(...)`. The SDK resolves
  the native product ID and any applicable Google base-plan/offer token from
  the offering.
- Never hardcode store product IDs, prices, or offer tokens.
- Package identifiers, product IDs, prices, billing periods, trials, and offers
  are runtime catalog data — they can change without an app release.

## Next

- [Making purchases](/expo/purchases/)

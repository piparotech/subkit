---
title: React hooks
description: The complete React hook surface — useSubKitEntitlement, useSubKitOfferings, and useSubKitIapAutoSync.
---

The SDK ships three React hooks. All read from the configured singleton — call
`configureSubKit(...)` at module scope before any component renders
([Configuration](/expo/configuration/)).

| Hook                                            | Purpose                         |
| ----------------------------------------------- | ------------------------------- |
| [`useSubKitEntitlement`](#usesubkitentitlement) | Gate features on an entitlement |
| [`useSubKitOfferings`](#usesubkitofferings)     | Load offerings for a paywall    |
| [`useSubKitIapAutoSync`](#usesubkitiapautosync) | One purchase sync on mount      |

## `useSubKitEntitlement`

The primary gate. Subscribes to the shared customer-info snapshot and refreshes
on mount when data is older than `refreshIfOlderThanMs`:

```tsx
import { useSubKitEntitlement } from '@piparotech/subkit-expo'

const PRO = 'pro'

export function ProGate() {
  const { active, isLoading, refresh } = useSubKitEntitlement(PRO)

  if (isLoading) return <LoadingState />
  if (active) return <PaidFeatures />
  return <Paywall onPurchaseFinished={refresh} />
}
```

**Signature:**

```ts
useSubKitEntitlement(
  entitlementKey: string,
  options?: {
    enabled?: boolean // default true
    refreshOnMount?: boolean // default true
    refreshIfOlderThanMs?: number // default 60_000
  },
): {
  active: boolean // the only unlock signal
  status: EntitlementStatus | null // 'trialing', 'grace_period', …
  entitlement: CustomerEntitlement | null
  customerInfo: CustomerInfo | null
  state: SubKitCustomerInfoState // 'ready' | 'offline' | 'error' | …
  isLoading: boolean
  isRefreshing: boolean
  error: Error | null
  lastUpdatedAt: number | null
  refresh(): Promise<CustomerInfo | null>
}
```

It updates automatically whenever any SDK call — `identify()`,
`getCustomerInfo()`, restore, foreground sync, purchase sync — publishes newer
customer info. Full guidance: [Checking entitlements](/expo/entitlements/).

## `useSubKitOfferings`

Loads offerings for paywall rendering, with loading/refresh state and
out-of-order response protection:

```tsx
import { useSubKitOfferings } from '@piparotech/subkit-expo'

export function Paywall() {
  const { current, isLoading, error, refresh } = useSubKitOfferings()

  if (isLoading) return <PaywallSkeleton />
  if (error != null) return <PaywallError onRetry={refresh} />

  const purchasable = current?.packages.filter((pkg) => pkg.storeProduct != null) ?? []
  if (purchasable.length === 0) return <PaywallUnavailable />

  return <PackageList packages={purchasable} />
}
```

**Signature:**

```ts
useSubKitOfferings(options?: {
  enabled?: boolean // default true; false defers loading
  placement?: string // optional placement filter
}): {
  current: SubKitOffering | null // the default offering
  offerings: SubKitOfferingsResponse | null // full response (current + all)
  isLoading: boolean // first load, no data yet
  isRefreshing: boolean // reload with data present
  error: Error | null
  refresh(): Promise<SubKitOfferingsResponse | null>
}
```

Behavior:

- Loads on mount (unless `enabled: false`) and reloads when `placement`
  changes.
- `refresh()` after purchases or `identify()` — offer eligibility can change.
- Unlike `useSubKitEntitlement`, offerings are fetched per hook use, not from a
  shared snapshot; two paywalls with different placements load independently.
- Packages without a `storeProduct` are not purchasable — filter them out
  ([Offerings & paywalls](/expo/offerings/#missing-storeproduct-means-not-purchasable)).

## `useSubKitIapAutoSync`

Triggers exactly one `app_start` purchase sync on first mount. Only needed when
you disable `syncOnAppStart` or want the sync tied to a specific screen:

```tsx
import { useSubKitIapAutoSync } from '@piparotech/subkit-expo'

export function AppRoot() {
  useSubKitIapAutoSync()
  return <Navigation />
}
```

**Signature:**

```ts
useSubKitIapAutoSync(options?: {
  enabled?: boolean // default true
  syncOnMount?: boolean // default true
  logger?: { warn(message: string, error?: unknown): void }
}): void
```

Sync failures are logged via `logger.warn` (never thrown into render). With
default configuration the SDK already syncs on app start, so most apps do not
need this hook — see [Restore & sync](/expo/restore-and-sync/).

## Rules that apply to all hooks

- Hooks read the configured singleton; using them before `configureSubKit`
  reports `state: 'unconfigured'` / throws on action.
- `active` is the only unlock signal — never unlock on `status` or a returned
  purchase call ([Making purchases](/expo/purchases/)).
- Hooks are safe under React strict mode; mount effects guard against
  double-invocation.

---
title: Checking entitlements
description: The useSubKitEntitlement hook, imperative reads, entitlement status beyond active, and refresh control.
---

Gate features on the entitlement your product grants — for example `pro` — not
on subscriptions, packages, or store-product IDs. This keeps app logic stable
even when multiple store products or a club contract grant the same access.

## The hook

```tsx
import { useSubKitEntitlement } from '@piparotech/subkit-expo'

const PRO = 'pro'

export function ProGate() {
  const { active: hasPro, isLoading, refresh } = useSubKitEntitlement(PRO)

  if (isLoading) return <LoadingState />
  if (hasPro) return <PaidFeatures />
  return <Paywall onPurchaseFinished={refresh} />
}
```

The hook reads the latest known `CustomerInfo` from the configured singleton
and refreshes on mount when the snapshot is older than
`refreshIfOlderThanMs` (default 60 s). It updates automatically whenever SDK
calls — `identify()`, `getCustomerInfo()`, restore, foreground sync, or
purchase sync — receive newer customer info.

### Full result

```ts
const {
  active, // boolean — the only unlock signal
  status, // EntitlementStatus | null — for UI nuance
  entitlement, // CustomerEntitlement | null — full details
  customerInfo, // CustomerInfo | null
  state, // snapshot state (see below)
  isLoading, // no data yet, first load running
  isRefreshing, // data present, refresh running
  error, // Error | null
  lastUpdatedAt, // ms timestamp of last successful update
  refresh, // () => Promise<CustomerInfo | null>
} = useSubKitEntitlement(PRO)
```

### Options

```ts
useSubKitEntitlement(PRO, {
  enabled: true, // set false to pause the hook
  refreshOnMount: true, // set false to skip the mount refresh
  refreshIfOlderThanMs: 60_000, // freshness threshold for the mount refresh
})
```

## Snapshot states

The shared customer-info snapshot moves through:
`unconfigured → idle → loading → ready ⇄ refreshing`, with `offline` when a
refresh fails but cached data exists, and `error` when a refresh fails with no
data. A network failure never erases a previously active entitlement before
its known expiry — see [Offline access](/docs/expo/offline/).

## `active` vs. `status`

`active` is the unlock signal. `status` explains _why_ and enables better UX:

| Status                 | Typically active? | UI suggestion                               |
| ---------------------- | ----------------- | ------------------------------------------- |
| `active`               | yes               | Normal paid state                           |
| `trialing`             | yes               | Show trial badge / days remaining           |
| `grace_period`         | yes               | "Update payment method" banner, keep access |
| `billing_retry`        | varies            | Payment problem notice                      |
| `paused`               | no                | "Resume subscription" prompt                |
| `expired`              | no                | Winback paywall                             |
| `refunded` / `revoked` | no                | Access removed                              |
| `pending`              | no                | Confirmation in progress                    |

Never unlock on status alone — check `active`.

## Entitlement details

`CustomerEntitlement` carries the evidence behind the state:

```ts
entitlement.entitlementKey // 'pro'
entitlement.expiresAt // ISO date or null (non-expiring)
entitlement.productIdentifier // which product granted it
entitlement.planKey // which plan granted it
entitlement.source // 'apple' | 'google' | 'voucher' | 'promo' | 'manual' | 'lifetime' | 'migration' | 'family_shared'
entitlement.startsAt // when it began
entitlement.verifiedAt // last verification time
```

## Imperative checks outside React

```ts
import { client } from '@piparotech/subkit-expo'

const PREMIUM = 'premium'
const info = await client.getCustomerInfo()
const hasPremium = info.entitlements[PREMIUM]?.active === true
```

Use `refresh()` (from the hook) or `getCustomerInfo()` before access-sensitive
actions or after a custom purchase flow when you need a fresh server read.

## Next

- [React hooks](/docs/expo/hooks/) — the complete hook reference
- [Restore & sync](/docs/expo/restore-and-sync/)
- [Offline access](/docs/expo/offline/)

---
title: React hooks
description: The complete React hook surface — effective access, Boolean gates, offerings, and automatic IAP sync.
---

Call `configureSubKit(...)` at module scope before any component renders. Hooks
read the configured singleton and update when SDK operations publish newer
CustomerInfo.

| Hook                      | Purpose                                     |
| ------------------------- | ------------------------------------------- |
| `useSubKitAccess(key)`    | Detailed impossible-state-safe access union |
| `useSubKitHasAccess(key)` | Fail-closed Boolean feature gate            |
| `useSubKitOfferings()`    | Load offerings for a paywall                |
| `useSubKitIapAutoSync()`  | Trigger one purchase sync on mount          |

## `useSubKitAccess`

The primary detailed gate:

```tsx compile
import { useSubKitAccess } from '@piparotech/subkit-expo'

export function ProGate() {
  const access = useSubKitAccess('pro')

  if (access.state === 'loading') return <LoadingState />
  if (access.state === 'granted') return <PaidFeatures />
  return <Paywall onPurchaseFinished={access.refresh} />
}
```

**Signature:**

```text
useSubKitAccess(
  entitlementKey: string,
  options?: {
    enabled?: boolean
    refreshOnMount?: boolean
    refreshIfOlderThanMs?: number
  },
): SubKitEntitlementAccess & {
  refresh(): Promise<SubKitEntitlementAccess>
}
```

The union states are `granted`, `missing`, `inactive`, `device_blocked`,
`loading`, `offline_unavailable`, `error`, and `unconfigured`. State-specific
fields exist only in their valid branch.

## `useSubKitHasAccess`

Use this when a component only needs a Boolean and has no recovery/status UI:

```tsx compile
import { useSubKitHasAccess } from '@piparotech/subkit-expo'

export function ProFeature() {
  const hasPro = useSubKitHasAccess('pro')
  return hasPro ? <PaidFeatures /> : <Paywall />
}
```

It delegates to the same resolver as `useSubKitAccess`; it is not a separate
policy implementation. Lifecycle and error states fail closed to `false`.

## `useSubKitOfferings`

Loads offerings for paywall rendering, with loading/refresh state and
out-of-order response protection:

```tsx compile
import { useSubKitOfferings } from '@piparotech/subkit-expo'

export function PaywallPackages() {
  const { current, isLoading, error, refresh } = useSubKitOfferings()

  if (isLoading) return <PaywallSkeleton />
  if (error != null) return <PaywallError onRetry={refresh} />

  const purchasable = current?.packages.filter((pkg) => pkg.storeProduct != null) ?? []
  if (purchasable.length === 0) return <PaywallUnavailable />

  return <PackageList packages={purchasable} />
}
```

Offerings are fetched per hook use. Packages without `storeProduct` are not
purchasable.

## `useSubKitIapAutoSync`

With default configuration the SDK already syncs on app start. Use this hook
only when startup sync is disabled or tied to a specific component:

```tsx compile
import { useSubKitIapAutoSync } from '@piparotech/subkit-expo'

export function AppRoot() {
  useSubKitIapAutoSync()
  return <AppNavigation />
}
```

Sync failures are logged through the optional logger and never thrown into
render.

## Rules that apply to all hooks

- `useSubKitAccess` is the detailed access authority.
- `useSubKitHasAccess` is a fail-closed convenience derived from that authority.
- Do not combine raw entitlement and device fields in app code.
- A purchase result alone never grants access.
- Hooks are safe under React strict mode.

Full guidance: [Checking effective access](/docs/expo/entitlements/).

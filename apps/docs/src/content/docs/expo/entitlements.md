---
title: Checking effective access
description: Gate features with one impossible-state-safe SubKit access decision instead of combining entitlement and device fields in app code.
---

SubKit owns the complete access decision. Your app names the entitlement it
needs — for example `pro` — and reads one discriminated union. Do not combine
raw `CustomerInfo.entitlements` and `CustomerInfo.deviceAccess` fields in app
code.

This is the canonical guide for an access check, entitlement check, feature
gate, Pro gate, or device-blocked recovery flow.

## The simple gate

```tsx compile
import { useSubKitAccess } from '@piparotech/subkit-expo'

const PRO = 'pro'

export function ProGate() {
  const access = useSubKitAccess(PRO)

  if (access.state === 'loading') return <LoadingState />
  if (access.state !== 'granted') return <Paywall onPurchaseFinished={access.refresh} />
  return <PaidFeatures />
}
```

`state === 'granted'` is the only detailed unlock signal. It already includes:

- the requested entitlement being commercially active;
- the currently authorized installation/device context;
- offline expiry and cache policy;
- provider-verified SubKit state.

For a fail-closed Boolean gate where no recovery UI is needed:

```tsx compile
import { useSubKitHasAccess } from '@piparotech/subkit-expo'

export function ProFeature() {
  const hasPro = useSubKitHasAccess('pro')
  return hasPro ? <PaidFeatures /> : <Paywall />
}
```

## Access states

`useSubKitAccess()` returns one impossible-state-safe union:

| State                 | Meaning                                                               | Typical UI                          |
| --------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| `granted`             | Requested entitlement is active and usable on this installation       | Render the protected feature        |
| `missing`             | CustomerInfo has no entry for the requested entitlement               | Paywall or explain unavailable plan |
| `inactive`            | Requested entitlement exists but is not commercially active           | Renewal or win-back UI              |
| `device_blocked`      | Requested entitlement is active, but this installation needs recovery | Device-management recovery          |
| `loading`             | No access decision is available yet                                   | Loading state                       |
| `offline_unavailable` | Network unavailable and no bounded cached decision exists             | Offline retry state                 |
| `error`               | A non-network refresh/configuration failure prevents a decision       | Error and retry                     |
| `unconfigured`        | `configureSubKit()` has not installed the singleton                   | Treat as integration error          |

State-specific data only exists where valid. For example, `reason` exists only
on `device_blocked`; a `granted` decision cannot carry a block reason.

## Complete recovery UI

```tsx compile
import { useSubKitAccess } from '@piparotech/subkit-expo'

export function ProAccessBoundary() {
  const access = useSubKitAccess('pro')

  switch (access.state) {
    case 'granted':
      return <PaidFeatures />
    case 'device_blocked':
      return <DeviceRecovery reason={access.reason} />
    case 'missing':
    case 'inactive':
      return <Paywall onPurchaseFinished={access.refresh} />
    case 'loading':
      return <LoadingState />
    case 'offline_unavailable':
      return <OfflineNotice />
    case 'error':
      return <PaywallError onRetry={access.refresh} />
    case 'unconfigured':
      return <ConfigurationError />
  }
}
```

## Evidence and commercial details

Resolved decisions carry evidence:

```ts compile
const access = useSubKitAccess('pro')

if (access.state === 'granted') {
  access.entitlement.active // literal true
  access.entitlement.status // active, trialing, grace_period, ...
  access.entitlement.expiresAt
  access.evidence.checkedAt
  access.evidence.freshness // fresh, stale, syncing, offline, error
}
```

`entitlement.active` describes commercial state. `access.state === 'granted'`
describes effective feature access. Apps should gate on the latter.

## Imperative reads

Outside React, ask the configured client for the same canonical decision:

```ts compile
import { client } from '@piparotech/subkit-expo'

const access = await client.getAccess('pro')
if (access.state === 'granted') {
  unlockPaidAccess()
}
```

For a Boolean:

```ts compile
const hasPro = await client.hasAccess('pro')
```

For synchronous app-store integration or external-state bridges:

```ts compile
import { getSubKitAccessSnapshot, subscribeSubKitAccess } from '@piparotech/subkit-expo'

const current = getSubKitAccessSnapshot('pro')
const unsubscribe = subscribeSubKitAccess('pro', (access) => {
  renderAccessState(access)
})
```

## Refresh behavior

The hook refreshes on mount when the shared snapshot is older than
`refreshIfOlderThanMs` (default 60 seconds). Customize it when necessary:

```ts compile
useSubKitAccess('pro', {
  enabled: true,
  refreshOnMount: true,
  refreshIfOlderThanMs: 60_000,
})
```

`refresh()` always resolves to the latest access union, including
`offline_unavailable` or `error`; recovery UI does not need to catch transport
errors merely to discover the new state.

## Raw CustomerInfo is advanced diagnostics

`client.getCustomerInfo()` remains available for support diagnostics,
ownership UI, purchase history, and advanced device management. It is not the
recommended feature-gate API. Centralizing the decision in SubKit prevents
apps from drifting when device policy, offline limits, or entitlement rules
change.

## Next

- [Making purchases](/docs/expo/purchases/)
- [Restore & sync](/docs/expo/restore-and-sync/)
- [Offline access](/docs/expo/offline/)
- [Migrate manual access checks](/docs/expo/migrating-effective-access/)

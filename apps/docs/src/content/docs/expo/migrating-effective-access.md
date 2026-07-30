---
title: Migrate to effective access
description: Replace manual CustomerInfo entitlement and device checks with the canonical SubKit access decision.
---

The Effective Access API removes access-policy reconstruction from application
code. This migration is required when upgrading from the earlier entitlement
hook or direct CustomerInfo gates.

## Before

The previous integration pattern forced each app to combine commercial and
device state:

```text
// Legacy example — do not copy.
const hasPro =
  customerInfo.entitlements.pro?.active === true &&
  customerInfo.deviceAccess?.blockedReason == null
```

This duplicates SubKit policy and can drift as offline and device rules evolve.
Separate booleans can also produce contradictory app states.

## After

```ts compile
const access = await client.getAccess('pro')
const hasPro = access.state === 'granted'
```

```ts compile
import { client } from '@piparotech/subkit-expo'
```

React:

```tsx compile
import { useSubKitAccess } from '@piparotech/subkit-expo'

export function ProGate() {
  const access = useSubKitAccess('pro')
  return access.state === 'granted' ? <PaidFeatures /> : <Paywall />
}
```

## Mapping old fields

| Old app-level field/check      | New source                                              |
| ------------------------------ | ------------------------------------------------------- |
| `entitlement.active` as gate   | `access.state === 'granted'`                            |
| separate block reason          | `access.state === 'device_blocked'` and `access.reason` |
| separate loading Boolean       | `access.state === 'loading'`                            |
| offline plus cached Boolean    | resolved state plus `access.evidence.freshness`         |
| local native `isPro` authority | `useSubKitHasAccess('pro')`                             |

## Apps with web and native payment paths

A thin app-level facade may select the platform authority, but must not
reimplement SubKit policy:

```ts compile
export function useProAccess(): boolean {
  return useSubKitHasAccess('pro')
}
```

```ts compile
import { useSubKitHasAccess } from '@piparotech/subkit-expo'
```

A `.web.ts` counterpart can read the web/Stripe authority. Native production
still delegates the complete decision to SubKit; explicit development dummy
payments may remain local and isolated.

## Remove duplicate state

Delete native app projections such as:

- `customerInfoHasPro()`;
- `projectCustomerInfo()`;
- separate `deviceBlockedReason` plus `isPro` fields;
- native `applyStoreSync(hasPro)` persistence.

Keep Raw CustomerInfo only where diagnostics, support, ownership, or advanced
device-management UI actually needs it.

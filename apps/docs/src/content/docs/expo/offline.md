---
title: Offline access
description: How cached CustomerInfo behaves offline — freshness states, expiry rules, and the accessContext lifecycle.
---

The SDK persists `CustomerInfo` locally and publishes it on startup **before**
network sync completes, so your app renders access state immediately. Offline
behavior is deliberately conservative: it neither erases valid access on a
network blip nor extends access forever.

## Cache scoping

The default AsyncStorage cache is scoped to the SDK key, installation ID,
store environment, and a **hashed** app-user identity. Switching users cannot
read another user's cached access.

## Freshness states

`customerInfo.freshness` reports how current the data is:

| Freshness | Meaning                                                                   |
| --------- | ------------------------------------------------------------------------- |
| `fresh`   | Recently confirmed by the server                                          |
| `stale`   | Cache older than `customerInfoStaleAfterMs` (default 24 h) — still usable |
| `syncing` | A refresh is in flight                                                    |
| `offline` | Last refresh failed; serving cached data                                  |
| `error`   | Refresh failed with no usable cache                                       |

Staleness itself does **not** revoke access; it is a signal that a refresh is
due.

## Offline expiry rules

Cached entitlements are re-evaluated whenever they are read:

- **Expiring entitlements** stay active offline only until their
  server-provided `expiresAt`. Past that, they flip to
  `active: false, status: 'expired'` locally.
- **Non-expiring entitlements** (lifetime, some contracts) stay usable offline
  for at most `nonExpiringEntitlementMaxOfflineAgeMs` after their `verifiedAt`
  (default 30 days). A device that never reconnects cannot hold lifetime
  access forever.
- An expired **`accessContext`** is removed from cached/offline customer info
  even when the entitlement itself remains usable within its offline window.

## Failure semantics

A failed refresh with cached data sets the snapshot state and freshness to
`offline` — it does **not** clear a previously active entitlement before its
known expiry. The error remains available for UI and diagnostics via the
hook's `error` field.

```tsx
const { active, state, error } = useSubKitEntitlement('pro')

// active stays true offline until expiry rules say otherwise
// state === 'offline' lets you show a subtle connectivity notice
```

```ts
import { useSubKitEntitlement } from '@piparotech/subkit-expo'
```

## What `accessContext` is

Fresh `CustomerInfo` includes a short-lived, signed, opaque `accessContext`
after provider verification. A trusted app backend can forward it to SubKit
server reads: the token binds app, app user, and the provider-verified store
environment, and expires independently of offline entitlement visibility. The
mobile app treats it as opaque — never parse or persist it separately.

## Tuning

Apps with stricter requirements can lower `customerInfoStaleAfterMs` and
`nonExpiringEntitlementMaxOfflineAgeMs`, or provide their own
`customerInfoCache` implementation — see
[Advanced configuration](/expo/advanced/#custom-customerinfo-cache).

## Next

- [Ownership & unclaimed](/expo/conflicts/)

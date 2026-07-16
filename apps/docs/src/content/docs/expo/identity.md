---
title: Identifying users
description: Anonymous start, identify() after login, identity switches, and automatic store identity hints.
---

Purchases require an identified user. Reads work anonymously, but
`purchasePackage(...)` fails closed with `missing_identity` until an
`appUserId` is known.

## Anonymous start, identify later

If the user is not logged in at startup, configure without `appUserId`, then
identify after login:

```ts
import { client } from '@piparotech/subkit-expo'

const customerInfo = await client.identify(user.id)
```

`identify(appUserId)` returns fresh `CustomerInfo` and triggers an
`identity_changed` purchase sync, so purchases made on this install are
reconciled under the newly identified user.

If the user is already known at startup, pass `appUserId` directly to
`configureSubKit(...)` — no separate `identify()` call needed.

## What identity scopes

- **CustomerInfo cache** — persisted per app / install / hashed app-user
  identity. Switching users does not leak another user's cached access.
- **Purchase queue** — a queued purchase stays bound to the app user that first
  observed it, even across restarts and identity switches. One user's pending
  purchases are never reconciled under another user.

## Identity switches and logout

Calling `identify(...)` with a different user ID switches the active identity
and re-syncs. There is no explicit logout method on the client — for a full
reset (for example on logout), call `configureSubKit(...)` again without
`appUserId`; it stops the previous client and starts a clean one.

## Store identity hints are automatic

SubKit generates store identity hints and the SDK passes them to `expo-iap`
automatically on every purchase:

- iOS: `appAccountToken`
- Android: `obfuscatedAccountId`, optional `obfuscatedProfileId`

Your app never supplies these values manually. They let SubKit correlate
provider-side transactions with the app user during verification.

## Next

- [Offerings & paywalls](/expo/offerings/)

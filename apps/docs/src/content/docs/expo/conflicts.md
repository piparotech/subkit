---
title: Ownership & unclaimed purchases
description: Ownership states, unclaimed purchases with claim hints, conflict resolution, and family sharing.
---

A store purchase belongs to a store account; a SubKit entitlement belongs to an
app user. When those don't line up — shared devices, account switches, family
sharing — SubKit reports the mismatch instead of silently transferring access.

## Ownership on purchases

Each entry in `customerInfo.purchases` carries an ownership state:

| `ownership` | Meaning                                           |
| ----------- | ------------------------------------------------- |
| `current`   | Owned by the current app user                     |
| `alias`     | Owned by a linked identity of the current user    |
| `previous`  | Owned by a user previously active on this install |
| `unowned`   | Not attributed to any known user                  |
| `conflict`  | Claimed by a **different** app user               |

Plus `canClaim` (whether the current user could claim it) and `conflict` as a
quick flag.

## Unclaimed purchases

`customerInfo.unclaimedPurchases` lists store purchases that exist but are not
attributed to the current user. Each carries a `claimHint` telling you what to
do:

| `claimHint`        | UI action                                                            |
| ------------------ | -------------------------------------------------------------------- |
| `restore_required` | Offer the restore button ([Restore & sync](/expo/restore-and-sync/)) |
| `login_required`   | Ask the user to log in with the owning account                       |
| `support_required` | Route to support — automatic resolution is not safe                  |

```tsx
const info = await client.getCustomerInfo()

for (const unclaimed of info.unclaimedPurchases) {
  switch (unclaimed.claimHint) {
    case 'restore_required':
      showRestorePrompt()
      break
    case 'login_required':
      showLoginPrompt()
      break
    case 'support_required':
      showSupportLink()
      break
  }
}
```

```ts
import { client } from '@piparotech/subkit-expo'
```

## Sync conflicts

A `PurchaseSyncResult` can contain `conflicts` when a synced purchase is
already bound to another app user. Each conflict carries a resolution
recommendation:

| Resolution               | Meaning                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `login_original_account` | The user should log in with the account that made the purchase |
| `manual_review`          | An operator should review in the SubKit console                |
| `support_required`       | Needs support involvement                                      |

The SDK does not transfer ownership. Conflicted purchases are not reconciled
under the current user, and queued purchases stay bound to the app user that
first observed them.

## Family sharing

Family-shared access appears as a regular entitlement with
`source: 'family_shared'`; the underlying purchase carries
`ownershipType: 'family_shared'`. Gate on `active` as usual — no special
handling is required unless your product excludes shared access.

## Design guidance

- Treat conflicts as identity problems, not payment problems. The fix is
  logging in with the right account, not re-purchasing.
- Never show "buy again" as the primary action when an unclaimed purchase with
  `restore_required` exists.

## Next

- [Error handling](/expo/error-handling/)

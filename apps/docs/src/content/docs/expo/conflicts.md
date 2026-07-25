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

| `claimHint`        | UI action                                                                 |
| ------------------ | ------------------------------------------------------------------------- |
| `restore_required` | Offer the restore button ([Restore & sync](/docs/expo/restore-and-sync/)) |
| `login_required`   | Ask the user to log in with the owning account                            |
| `support_required` | Route to support — automatic resolution is not safe                       |

```tsx compile
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

```ts compile
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

## Beneficiary and device conflicts

Store restore first resolves a verified Store Purchase Lineage and its current Beneficiary. The installation ID is only a weak local input and never transfers ownership or creates a grant by itself.

`customerInfo.deviceAccess` separates commercial access from installation access:

| Field                | Meaning                                          |
| -------------------- | ------------------------------------------------ |
| `commerciallyActive` | The Beneficiary still has a valid purchase/grant |
| `blockedReason`      | Why this installation cannot currently use it    |
| `activation`         | Current redacted activation state, when present  |

Handle device outcomes without telling the user to buy again:

- `DEVICE_SELECTION_REQUIRED`: show the redacted device list and let the user choose an activation to replace.
- `DEVICE_REPLACEMENT_COOLDOWN`: show `nextAllowedAt`; do not blame the user or retry in a loop.
- `DEVICE_CHANGE_LIMIT_REACHED`: show the rolling `changeBudget` and `nextAllowedAt`.
- `DEVICE_REPLACED`: this installation was superseded. Cached offline authorization can remain valid only until the server-issued expiry.
- `LOGIN_REQUIRED` / `BENEFICIARY_CONFLICT`: require the documented account or support recovery path. Never silently transfer the Beneficiary.

Management-session tokens and Device Access tokens are distinct, short-lived, opaque capabilities. Do not parse, log, or expose them in UI.

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
- A valid purchase with blocked device access is not an inactive purchase. Keep commercial and installation messaging separate.

## Next

- [Error handling](/docs/expo/error-handling/)

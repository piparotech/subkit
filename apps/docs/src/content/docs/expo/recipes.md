---
title: Recipes
description: Complete patterns — gated screens, paywall preflight, trial and billing-issue UI, and restore with re-check.
---

Complete, copyable patterns for common flows. All follow the same rules:
entitlement-first, no early unlock, no static store values.

## Gated screen

Gate a whole screen (or route) on an entitlement, with loading and offline
handled:

```tsx compile
import { useSubKitEntitlement } from '@piparotech/subkit-expo'

const PRO = 'pro'

export function ProFeatureScreen() {
  const { active, isLoading, state, refresh } = useSubKitEntitlement(PRO)

  if (isLoading) return <ScreenSkeleton />

  if (!active) {
    return <Paywall onPurchaseFinished={refresh} />
  }

  return (
    <>
      {state === 'offline' ? <OfflineNotice /> : null}
      <ProFeatureContent />
    </>
  )
}
```

For navigation-level gating, run the same check in your router's guard and
redirect to the paywall route when `active` is false.

## Paywall preflight

Force a fresh sync before showing a paywall, so a purchase completed on
another device (or a stuck pending purchase) is reflected before the user is
asked to pay again:

```ts compile
import { client } from '@piparotech/subkit-expo'

const PRO = 'pro'

async function openPaywall(navigate: (route: string) => void) {
  try {
    await client.syncPurchases({ reason: 'paywall_preflight' })
  } catch {
    // preflight is best-effort; the paywall still opens on failure
  }

  const info = await client.getCustomerInfo()
  if (info.entitlements[PRO]?.active === true) {
    navigate('/pro') // already entitled — never show the paywall
    return
  }
  navigate('/paywall')
}
```

## Trial and billing-issue UI from `status`

Use `status` for nuance while `active` stays the only unlock signal:

```tsx compile
import { useSubKitEntitlement } from '@piparotech/subkit-expo'

const PRO = 'pro'

export function SubscriptionBadge() {
  const { active, status, entitlement } = useSubKitEntitlement(PRO)

  if (!active) return null

  switch (status) {
    case 'trialing':
      return <Badge tone="info" label={trialLabel(entitlement?.expiresAt)} />
    case 'grace_period':
    case 'billing_retry':
      return <Badge tone="warning" label="Payment issue — update your payment method" />
    default:
      return null
  }
}

function trialLabel(expiresAt: string | null | undefined): string {
  if (expiresAt == null) return 'Trial active'
  const daysLeft = Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 86_400_000))
  return `Trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
}
```

Pair `expired` with a winback paywall and `paused` with a resume prompt — see
the status table in [Checking entitlements](/docs/expo/entitlements/#active-vs-status).

## Restore & re-check access

The complete restore flow behind an explicit settings button:

```tsx compile
import { useState } from 'react'

import { client } from '@piparotech/subkit-expo'

const PRO = 'pro'

export function RestorePurchasesButton() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleRestore() {
    setBusy(true)
    setMessage(null)
    try {
      await client.restorePurchases()
      const info = await client.getCustomerInfo()
      const restored = info.entitlements[PRO]?.active === true
      setMessage(restored ? 'Purchases restored.' : 'No purchases to restore.')
    } catch {
      setMessage('Restore failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button label="Restore purchases" busy={busy} onPress={handleRestore} />
      {message != null ? <HelperText>{message}</HelperText> : null}
    </>
  )
}
```

## Handling unclaimed purchases on the paywall

Before asking a user to buy, surface an existing unclaimed purchase with the
right action instead of "buy again":

```tsx compile
const info = await client.getCustomerInfo()
const unclaimed = info.unclaimedPurchases[0]

if (unclaimed != null) {
  if (unclaimed.claimHint === 'restore_required') showRestorePrompt()
  else if (unclaimed.claimHint === 'login_required') showLoginPrompt()
  else showSupportLink()
}
```

See [Ownership & unclaimed](/docs/expo/conflicts/) for the full model.

## Next

- [Troubleshooting](/docs/expo/troubleshooting/)

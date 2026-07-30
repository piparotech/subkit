---
title: Recipes
description: Complete Effective Access patterns — gated screens, paywall preflight, commercial-status UI, restore, and platform facades.
---

Complete patterns for common flows. Every recipe names an entitlement and
reads SubKit's Effective Access decision. None reconstructs policy from raw
CustomerInfo fields.

## Gated screen

```tsx compile
import { useSubKitAccess } from '@piparotech/subkit-expo'

export function ProFeatureScreen() {
  const access = useSubKitAccess('pro')

  if (access.state === 'loading') return <ScreenSkeleton />
  if (access.state !== 'granted') {
    return <Paywall onPurchaseFinished={access.refresh} />
  }

  return (
    <>
      {access.evidence.freshness === 'offline' ? <OfflineNotice /> : null}
      <ProFeatureContent />
    </>
  )
}
```

## Paywall preflight

Force a fresh sync before asking a user to pay again:

```ts compile
import { client } from '@piparotech/subkit-expo'

async function openPaywall(navigate: (route: string) => void) {
  try {
    await client.syncPurchases({ reason: 'paywall_preflight' })
  } catch {
    // Best effort. The effective access read remains fail-closed.
  }

  const access = await client.getAccess('pro')
  navigate(access.state === 'granted' ? '/pro' : '/paywall')
}
```

## Trial and billing-issue UI

Read commercial details only after the union proves effective access:

```tsx compile
import { useSubKitAccess } from '@piparotech/subkit-expo'

export function SubscriptionBadge() {
  const access = useSubKitAccess('pro')
  if (access.state !== 'granted') return null

  switch (access.entitlement.status) {
    case 'trialing':
      return <Badge tone="info" label={trialLabel(access.entitlement.expiresAt)} />
    case 'grace_period':
    case 'billing_retry':
      return <Badge tone="warning" label="Payment issue — update your payment method" />
    default:
      return null
  }
}

function trialLabel(expiresAt: string | null): string {
  if (expiresAt == null) return 'Trial active'
  const daysLeft = Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 86_400_000))
  return `Trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
}
```

## Restore and re-check

```tsx compile
import { useState } from 'react'

import { client } from '@piparotech/subkit-expo'

export function RestorePurchasesButton() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleRestore() {
    setBusy(true)
    setMessage(null)
    try {
      await client.restorePurchases()
      const access = await client.getAccess('pro')
      setMessage(
        access.state === 'granted'
          ? 'Purchases restored.'
          : access.state === 'device_blocked'
            ? 'Purchase found. This device needs recovery.'
            : 'No active purchase to restore.',
      )
    } catch {
      setMessage('Restore failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return <Button disabled={busy} onPress={handleRestore} label={message ?? 'Restore purchases'} />
}
```

## Native SubKit plus a separate web payment path

Apps may expose one app-specific facade while keeping payment authorities
separate:

```ts compile
export function useProAccess(): boolean {
  return useSubKitHasAccess('pro')
}
```

```ts compile
import { useSubKitHasAccess } from '@piparotech/subkit-expo'
```

Use a `.web.ts` implementation for Stripe or another web authority. Do not
copy SubKit's entitlement/device/offline policy into the facade.

## Next

- [Checking effective access](/docs/expo/entitlements/)
- [Migrate to effective access](/docs/expo/migrating-effective-access/)

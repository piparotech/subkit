import { getRequestUrl } from '@tanstack/react-start/server'

import type { StatusTone } from '~/components/ui/types'
import type { Platform } from '~/domain/apps/types'
import type { RevenueBar } from '~/domain/dashboard/types'
import type { EntitlementGrantStatus } from '~/domain/entitlements/types'
import { purchaseEvents, storeCatalogSnapshots, storeProductBindings } from '~/db/schema'

import { formatCurrency } from './format'

export function appStatus(status: 'setup' | 'live' | 'beta' | 'inactive'): { label: string; tone: StatusTone } {
  if (status === 'setup') return { label: 'Setup', tone: 'warning' }
  if (status === 'live') return { label: 'Live', tone: 'success' }
  if (status === 'beta') return { label: 'Beta', tone: 'warning' }
  return { label: 'Inactive', tone: 'muted' }
}

export function consolePublicOrigin(): string {
  const configuredBaseUrl = parseConfiguredAuthBaseUrl()
  if (configuredBaseUrl != null) return configuredBaseUrl.origin

  const requestUrl = getRequestUrl({ xForwardedHost: true, xForwardedProto: true })
  return requestUrl.origin
}

function parseConfiguredAuthBaseUrl(): URL | null {
  try {
    return new URL(process.env.AUTH_BASE_URL ?? '')
  } catch {
    return null
  }
}

export function grantStatus(status: EntitlementGrantStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case 'active':
      return { label: 'Active', tone: 'success' }
    case 'trialing':
      return { label: 'Trialing', tone: 'warning' }
    case 'billing_retry':
      return { label: 'Billing retry', tone: 'destructive' }
    case 'expired':
      return { label: 'Expired', tone: 'muted' }
    case 'revoked':
      return { label: 'Revoked', tone: 'destructive' }
  }
}

export function sourceLabel(source: string): string {
  if (source === 'apple') return 'Apple'
  if (source === 'google') return 'Google'
  if (source === 'voucher') return 'Voucher'
  if (source === 'promo') return 'Promo'
  if (source === 'manual') return 'Manual'
  if (source === 'lifetime') return 'Lifetime'
  if (source === 'migration') return 'Migration'
  return source
}

export function storeSyncObjectLabel(
  binding: typeof storeProductBindings.$inferSelect | null | undefined,
  snapshot: typeof storeCatalogSnapshots.$inferSelect | null | undefined,
): string {
  if (binding != null) {
    const basePlan = binding.externalBasePlanId.trim()
    return basePlan === '' ? `${binding.store}:${binding.externalProductId}` : `${binding.store}:${binding.externalProductId}:${basePlan}`
  }
  if (snapshot != null) return `${snapshot.store}:${snapshot.externalId}`
  return 'unbound store object'
}

export function shortUserId(userId: string): string {
  const [firstPart] = userId.split('-')
  if (!firstPart) throw new Error('App User id is required')
  return firstPart
}

export function isAccessGrant(status: EntitlementGrantStatus): boolean {
  return status === 'active' || status === 'trialing' || status === 'billing_retry'
}

function grantPriority(status: EntitlementGrantStatus): number {
  if (status === 'active') return 0
  if (status === 'trialing') return 1
  if (status === 'billing_retry') return 2
  if (status === 'expired') return 3
  return 4
}

export function sortGrantsByRelevance<T extends { createdAt: Date; status: EntitlementGrantStatus }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const priorityDelta = grantPriority(left.status) - grantPriority(right.status)
    if (priorityDelta !== 0) return priorityDelta
    return right.createdAt.getTime() - left.createdAt.getTime()
  })
}

export function revenueBarsForEvents(events: readonly typeof purchaseEvents.$inferSelect[]): RevenueBar[] {
  const revenueByMonth = new Map<string, number>()
  for (const event of events) {
    if (event.amountCents == null) continue
    const month = event.occurredOn.slice(0, 7)
    if (!month) continue
    revenueByMonth.set(month, (revenueByMonth.get(month) ?? 0) + event.amountCents)
  }

  const values = [...revenueByMonth.entries()].sort(([left], [right]) => left.localeCompare(right))
  const maxRevenue = Math.max(...values.map(([, cents]) => cents))
  if (!Number.isFinite(maxRevenue) || maxRevenue <= 0) return []

  return values.map(([month, cents]) => ({ height: `${Math.max(1, Math.round((cents * 100) / maxRevenue))}%`, month, value: formatCurrency(cents) }))
}

export function appPlatformLabels(appleAppId: string | null, iosBundleId: string | null, bundleId: string, androidPackageName: string | null): Platform[] {
  const platforms: Platform[] = []
  if (appleAppId != null && appleAppId.trim() !== '') platforms.push('iOS')
  else if (iosBundleId != null && iosBundleId.trim() !== '') platforms.push('iOS')
  else if (bundleId.trim() !== '') platforms.push('iOS')
  if (androidPackageName != null && androidPackageName.trim() !== '') platforms.push('Android')
  return platforms
}

export function appStoreSummary(appleAppId: string | null, iosBundleId: string | null, bundleId: string, androidPackageName: string | null): string {
  const appleId = appleAppId?.trim()
  const ios = iosBundleId?.trim() || bundleId.trim()
  const android = androidPackageName?.trim()
  if (ios && android) return 'iOS + Android mapped'
  if (ios) return `iOS ${ios}`
  if (appleId) return `App Store Connect ${appleId}`
  if (android) return `Android ${android}`
  return 'Local app · no store mapping'
}

export function isOwnedApp(appId: string, ownedAppIds: ReadonlySet<string>): boolean {
  return ownedAppIds.has(appId)
}

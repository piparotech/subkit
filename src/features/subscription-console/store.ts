import type { AppDraft, AppStatusValue, AppTenant, StatusTone, Subscriber, SubscriptionProduct } from './types'

const appColors = [
  'oklch(0.62 0.17 152)',
  'oklch(0.55 0.19 264)',
  'oklch(0.72 0.15 60)',
  'oklch(0.58 0.16 300)',
  'oklch(0.6 0.13 200)',
]

export function initialsForName(name: string): string {
  const clean = name.trim()
  if (!clean) throw new Error('App name is required')
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]?.slice(0, 2).toUpperCase() ?? clean.slice(0, 2).toUpperCase()
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function idForLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!normalized) throw new Error('Label is required')
  return normalized
}

export function createAppFromDraft(draft: AppDraft, existingCount: number, tenantId: string): AppTenant {
  const name = draft.name.trim()
  const iosBundle = draft.iosBundle.trim()
  const androidPackage = draft.androidPackage.trim()
  const status = readAppStatus(draft.status)
  if (!name) throw new Error('App name is required')
  if (!iosBundle && !androidPackage) throw new Error('At least one store bundle identifier is required')

  const id = `${tenantId}:${idForLabel(name)}`
  const platforms = [iosBundle ? 'iOS' : null, androidPackage ? 'Android' : null].filter((platform): platform is 'iOS' | 'Android' => platform != null)
  return {
    id,
    tenantId,
    name,
    initials: initialsForName(name),
    color: appColors[existingCount % appColors.length] ?? appColors[0],
    bundle: iosBundle || androidPackage,
    platforms,
    mrr: '$0',
    activeSubs: '0',
    status: formatAppStatus(status),
    statusTone: appStatusTone(status),
  }
}

function readAppStatus(status: AppStatusValue | ''): AppStatusValue {
  if (status === 'live' || status === 'beta' || status === 'inactive') return status
  throw new Error('App status is required')
}

function formatAppStatus(status: AppStatusValue): string {
  if (status === 'live') return 'Live'
  if (status === 'beta') return 'Beta'
  return 'Inactive'
}

function appStatusTone(status: AppStatusValue): StatusTone {
  if (status === 'live') return 'success'
  if (status === 'beta') return 'warning'
  return 'muted'
}

export function matchesQuery(query: string, values: readonly string[]): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return values.some((value) => value.toLowerCase().includes(normalized))
}

export function filterApps(items: readonly AppTenant[], query: string): AppTenant[] {
  return items.filter((app) => matchesQuery(query, [app.name, app.bundle, app.status, app.platforms.join(' ')]))
}

export function filterSubscriptions(items: readonly SubscriptionProduct[], query: string): SubscriptionProduct[] {
  return items.filter((subscription) =>
    matchesQuery(query, [
      subscription.name,
      subscription.identifier,
      subscription.iosId,
      subscription.androidId,
      subscription.price,
      subscription.entitlement,
      subscription.duration,
    ]),
  )
}

export function filterSubscribers(items: readonly Subscriber[], query: string): Subscriber[] {
  return items.filter((subscriber) =>
    matchesQuery(query, [
      subscriber.userId,
      subscriber.country,
      subscriber.countryCode,
      subscriber.plan,
      subscriber.status,
      subscriber.entitlement,
    ]),
  )
}

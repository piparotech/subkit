import type { AppDraft, AppStatusValue, AppTenant, AppUser, StatusTone, SubscriptionProduct } from './types'

export interface AppRouteParams {
  appSlug: string
  tenantSlug: string
}

interface AppRouteSource {
  appleAppId: string | null
  id: string
  iosBundleId: string | null
  name: string
  tenantId: string
}

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

export function appRouteParams(app: AppRouteSource): AppRouteParams {
  return { appSlug: appRouteSlug(app), tenantSlug: tenantRouteSlug(app.tenantId) }
}

export function appMatchesRouteParams(app: AppRouteSource, params: AppRouteParams): boolean {
  return tenantRouteSlug(app.tenantId) === params.tenantSlug && appRouteSlug(app) === params.appSlug
}

function appRouteSlug(app: AppRouteSource): string {
  const label = app.name.trim() || app.iosBundleId?.trim() || app.appleAppId?.trim() || app.id
  return idForLabel(label)
}

function tenantRouteSlug(tenantId: string): string {
  return idForLabel(tenantId)
}

export function createAppFromDraft(draft: AppDraft, existingCount: number, tenantId: string): AppTenant {
  const name = draft.name.trim()
  const appleAppId = draft.appleAppId.trim()
  const bundleId = draft.bundleId.trim()
  const status: AppStatusValue = 'setup'
  if (!name) throw new Error('App name is required')
  if (!appleAppId) throw new Error('Select an App Store Connect app first')

  const id = `${tenantId}:ios:${appleAppId}`
  return {
    id,
    tenantId,
    name,
    initials: initialsForName(name),
    color: appColors[existingCount % appColors.length] ?? appColors[0],
    bundle: bundleId ? `iOS ${bundleId}` : `App Store Connect ${appleAppId}`,
    appleAppId,
    iosBundleId: bundleId || null,
    androidPackageName: null,
    platforms: ['iOS'],
    mrr: '$0',
    activeAppUsers: '0',
    status: formatAppStatus(status),
    statusTone: appStatusTone(status),
  }
}

function formatAppStatus(status: AppStatusValue): string {
  if (status === 'setup') return 'Setup'
  if (status === 'live') return 'Live'
  if (status === 'beta') return 'Beta'
  return 'Inactive'
}

function appStatusTone(status: AppStatusValue): StatusTone {
  if (status === 'live') return 'success'
  if (status === 'beta' || status === 'setup') return 'warning'
  return 'muted'
}

export function matchesQuery(query: string, values: readonly string[]): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return values.some((value) => value.toLowerCase().includes(normalized))
}

export function filterApps(items: readonly AppTenant[], query: string): AppTenant[] {
  return items.filter((app) =>
    matchesQuery(query, [
      app.name,
      app.bundle,
      app.appleAppId ?? '',
      app.iosBundleId ?? '',
      app.androidPackageName ?? '',
      app.status,
      app.platforms.join(' '),
    ]),
  )
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

export function filterAppUsers(items: readonly AppUser[], query: string): AppUser[] {
  return items.filter((appUser) =>
    matchesQuery(query, [
      appUser.appUserId,
      appUser.country,
      appUser.countryCode,
      appUser.primaryEntitlement,
      appUser.primarySource,
      appUser.status,
    ]),
  )
}

import type { StatusTone } from '~/components/ui/types'
import type { AppDraft, AppStatusValue, AppTenant } from '~/domain/apps/types'

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

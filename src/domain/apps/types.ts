import type { StatusTone } from '~/components/ui/types'

export type Platform = 'iOS' | 'Android'
export type AppStatusValue = 'setup' | 'live' | 'beta' | 'inactive'

export interface AppTenant {
  id: string
  tenantId: string
  name: string
  initials: string
  color: string
  bundle: string
  appleAppId: string | null
  iosBundleId: string | null
  androidPackageName: string | null
  platforms: Platform[]
  mrr: string
  activeAppUsers: string
  status: string
  statusTone: StatusTone
}

export interface AppDraft {
  appleAppId: string
  bundleId: string
  name: string
  sku: string
}

export type AppDraftField = keyof AppDraft

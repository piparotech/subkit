import { idForLabel } from '~/console/routing'
import { initialsForName } from '~/domain/apps/helpers'
import type { AppDraft } from '~/domain/apps/types'
import type { TenantDraft } from '~/domain/tenants/types'

export const emptyAppDraft: AppDraft = { appleAppId: '', bundleId: '', name: '', sku: '' }
export const emptyTenantDraft: TenantDraft = { color: 'oklch(0.62 0.17 152)', id: '', initials: '', name: '' }

export function safeTenantId(value: string): string {
  try {
    return idForLabel(value)
  } catch {
    return ''
  }
}

export function safeInitials(value: string): string {
  try {
    return initialsForName(value)
  } catch {
    return ''
  }
}

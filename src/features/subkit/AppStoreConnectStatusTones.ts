import type { AppStoreConnectCapabilityStatus, AppStoreConnectConnection, AppStoreConnectProductSyncAction, StatusTone } from './types'

export function connectionStatusTone(status: AppStoreConnectConnection['status']): StatusTone {
  if (status === 'connected') return 'success'
  if (status === 'invalid' || status === 'deleted') return 'destructive'
  return 'warning'
}

export function capabilityStatusTone(status: AppStoreConnectCapabilityStatus): StatusTone {
  if (status === 'available') return 'success'
  if (status === 'missing') return 'destructive'
  return 'warning'
}

export function productActionTone(action: AppStoreConnectProductSyncAction): StatusTone {
  if (action === 'create') return 'success'
  if (action === 'update') return 'warning'
  if (action === 'conflict') return 'destructive'
  return 'muted'
}

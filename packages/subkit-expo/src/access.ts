import {
  type EntitlementAccessDecision,
  isEntitlementAccessGranted,
  resolveEntitlementAccess,
} from '@piparotech/subkit-core'

import {
  type SubKitCustomerInfoSnapshot,
  getSubKitCustomerInfoSnapshot,
  refreshSubKitCustomerInfo,
  subscribeSubKitCustomerInfo,
} from './subKitState.js'

export type SubKitAccessLifecycle =
  | { state: 'unconfigured' }
  | { state: 'loading' }
  | { state: 'offline_unavailable' }
  | { error: Error; state: 'error' }

export type SubKitEntitlementAccess = EntitlementAccessDecision | SubKitAccessLifecycle

export function resolveSubKitEntitlementAccess(
  snapshot: SubKitCustomerInfoSnapshot,
  entitlementKey: string,
): SubKitEntitlementAccess {
  assertEntitlementKey(entitlementKey)
  if (snapshot.customerInfo != null) {
    return resolveEntitlementAccess(snapshot.customerInfo, entitlementKey)
  }

  switch (snapshot.state) {
    case 'unconfigured':
      return { state: 'unconfigured' }
    case 'error':
      if (isOfflineUnavailableError(snapshot.error)) {
        return { state: 'offline_unavailable' }
      }
      return {
        error: snapshot.error ?? new Error('SubKit access is unavailable'),
        state: 'error',
      }
    case 'initializing':
    case 'idle':
    case 'loading':
    case 'ready':
    case 'refreshing':
    case 'offline':
      return { state: 'loading' }
  }
}

export function getSubKitAccessSnapshot(entitlementKey: string): SubKitEntitlementAccess {
  return resolveSubKitEntitlementAccess(getSubKitCustomerInfoSnapshot(), entitlementKey)
}

export function getSubKitHasAccessSnapshot(entitlementKey: string): boolean {
  const access = getSubKitAccessSnapshot(entitlementKey)
  return access.state === 'granted' && isEntitlementAccessGranted(access)
}

export async function refreshSubKitAccess(
  entitlementKey: string,
): Promise<SubKitEntitlementAccess> {
  await refreshSubKitCustomerInfo().catch(() => null)
  return getSubKitAccessSnapshot(entitlementKey)
}

export function subscribeSubKitAccess(
  entitlementKey: string,
  listener: (access: SubKitEntitlementAccess) => void,
): () => void {
  assertEntitlementKey(entitlementKey)
  return subscribeSubKitCustomerInfo(() => {
    listener(getSubKitAccessSnapshot(entitlementKey))
  })
}

function assertEntitlementKey(entitlementKey: string): void {
  if (entitlementKey.trim() === '') {
    throw new Error('SubKit entitlement key is required')
  }
}

function isOfflineUnavailableError(error: Error | null): boolean {
  if (error == null) return false
  if ('code' in error) {
    const code = error.code
    if (code === 'network' || code === 'service_unavailable') return true
  }
  return /fetch|network|offline/i.test(error.message)
}

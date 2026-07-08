import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'

import type { CustomerEntitlement, CustomerInfo, EntitlementStatus } from '@piparotech/subkit-core'

import { client } from './SubKitIapClient.js'
import type { SubKitIapLogger } from './coordinator.js'
import {
  type SubKitCustomerInfoState,
  getSubKitCustomerInfoSnapshot,
  refreshSubKitCustomerInfo,
  subscribeSubKitCustomerInfo,
} from './subKitState.js'

const DEFAULT_REFRESH_IF_OLDER_THAN_MS = 60_000
const MIN_REFRESH_IF_OLDER_THAN_MS = 1_000

export interface UseSubKitIapAutoSyncOptions {
  enabled?: boolean
  logger?: Pick<SubKitIapLogger, 'warn'>
  syncOnMount?: boolean
}

export interface UseSubKitEntitlementOptions {
  enabled?: boolean
  refreshIfOlderThanMs?: number
  refreshOnMount?: boolean
}

export interface UseSubKitEntitlementResult {
  active: boolean
  customerInfo: CustomerInfo | null
  entitlement: CustomerEntitlement | null
  error: Error | null
  isLoading: boolean
  isRefreshing: boolean
  lastUpdatedAt: number | null
  refresh(): Promise<CustomerInfo | null>
  state: SubKitCustomerInfoState
  status: EntitlementStatus | null
}

export function useSubKitIapAutoSync(options: UseSubKitIapAutoSyncOptions = {}): void {
  const didSyncOnMountRef = useRef(false)
  const loggerRef = useRef(options.logger)
  loggerRef.current = options.logger

  useEffect(() => {
    if (options.enabled === false || options.syncOnMount === false || didSyncOnMountRef.current)
      return
    didSyncOnMountRef.current = true

    async function runSync(): Promise<void> {
      await client.syncPurchases({ reason: 'app_start' })
    }

    runSync().catch((error: unknown) => {
      loggerRef.current?.warn('SubKit app-start sync failed', error)
    })
  }, [options.enabled, options.syncOnMount])
}

export function useSubKitEntitlement(
  entitlementKey: string,
  options: UseSubKitEntitlementOptions = {},
): UseSubKitEntitlementResult {
  const snapshot = useSyncExternalStore(
    subscribeSubKitCustomerInfo,
    getSubKitCustomerInfoSnapshot,
    getSubKitCustomerInfoSnapshot,
  )
  const refresh = useCallback(() => refreshSubKitCustomerInfo(), [])

  useEffect(() => {
    if (options.enabled === false || options.refreshOnMount === false) return
    if (!shouldRefresh(snapshot.state)) return
    if (!snapshot.clientConfigured) return

    const refreshIfOlderThanMs = sanitizeRefreshIfOlderThanMs(options.refreshIfOlderThanMs)
    const freshnessAnchor =
      snapshot.state === 'error' ? snapshot.lastRefreshAttemptAt : snapshot.lastUpdatedAt
    if (freshnessAnchor != null && Date.now() - freshnessAnchor <= refreshIfOlderThanMs) return

    refreshSubKitCustomerInfo().catch(() => undefined)
  }, [
    options.enabled,
    options.refreshIfOlderThanMs,
    options.refreshOnMount,
    snapshot.clientConfigured,
    snapshot.lastRefreshAttemptAt,
    snapshot.lastUpdatedAt,
    snapshot.state,
  ])

  return useMemo(() => {
    const entitlement = snapshot.customerInfo?.entitlements[entitlementKey] ?? null
    return {
      active: entitlement?.active === true,
      customerInfo: snapshot.customerInfo,
      entitlement,
      error: snapshot.error,
      isLoading: snapshot.state === 'loading',
      isRefreshing: snapshot.state === 'refreshing',
      lastUpdatedAt: snapshot.lastUpdatedAt,
      refresh,
      state: snapshot.state,
      status: entitlement?.status ?? null,
    }
  }, [entitlementKey, refresh, snapshot])
}

function shouldRefresh(state: SubKitCustomerInfoState): boolean {
  return state === 'idle' || state === 'ready' || state === 'error'
}

function sanitizeRefreshIfOlderThanMs(value: number | undefined): number {
  if (value == null) return DEFAULT_REFRESH_IF_OLDER_THAN_MS
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_REFRESH_IF_OLDER_THAN_MS
  return Math.max(value, MIN_REFRESH_IF_OLDER_THAN_MS)
}

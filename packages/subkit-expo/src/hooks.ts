import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import type { CustomerEntitlement, CustomerInfo, EntitlementStatus } from '@piparotech/subkit-core'

import { client } from './SubKitIapClient.js'
import type { SubKitIapLogger } from './coordinator.js'
import {
  type SubKitCustomerInfoState,
  getSubKitCustomerInfoSnapshot,
  refreshSubKitCustomerInfo,
  subscribeSubKitCustomerInfo,
} from './subKitState.js'
import type { SubKitOffering, SubKitOfferingsResponse } from './types.js'

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

export interface UseSubKitOfferingsOptions {
  enabled?: boolean
  placement?: string
}

export interface UseSubKitOfferingsResult {
  current: SubKitOffering | null
  error: Error | null
  isLoading: boolean
  isRefreshing: boolean
  offerings: SubKitOfferingsResponse | null
  refresh(): Promise<SubKitOfferingsResponse | null>
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

export function useSubKitOfferings(
  options: UseSubKitOfferingsOptions = {},
): UseSubKitOfferingsResult {
  const enabled = options.enabled !== false
  const placement = options.placement

  const [offerings, setOfferings] = useState<SubKitOfferingsResponse | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)
  const hasDataRef = useRef(false)
  hasDataRef.current = offerings != null

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const load = useCallback(async (): Promise<SubKitOfferingsResponse | null> => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    if (mountedRef.current) {
      if (hasDataRef.current) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
    }

    try {
      const response = await client.getOfferings(placement == null ? undefined : { placement })
      if (mountedRef.current && requestIdRef.current === requestId) {
        setOfferings(response)
        setError(null)
      }
      return response
    } catch (loadError: unknown) {
      if (mountedRef.current && requestIdRef.current === requestId) {
        setError(normalizeHookError(loadError))
      }
      return null
    } finally {
      if (mountedRef.current && requestIdRef.current === requestId) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [placement])

  useEffect(() => {
    if (!enabled) return
    load().catch(() => undefined)
  }, [enabled, load])

  return useMemo(
    () => ({
      current: offerings?.current ?? null,
      error,
      isLoading,
      isRefreshing,
      offerings,
      refresh: load,
    }),
    [error, isLoading, isRefreshing, load, offerings],
  )
}

function normalizeHookError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return new Error('SubKit offerings request failed')
}

function shouldRefresh(state: SubKitCustomerInfoState): boolean {
  return state === 'idle' || state === 'ready' || state === 'offline' || state === 'error'
}

function sanitizeRefreshIfOlderThanMs(value: number | undefined): number {
  if (value == null) return DEFAULT_REFRESH_IF_OLDER_THAN_MS
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_REFRESH_IF_OLDER_THAN_MS
  return Math.max(value, MIN_REFRESH_IF_OLDER_THAN_MS)
}

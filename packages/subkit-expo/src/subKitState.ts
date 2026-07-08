import type { CustomerInfo } from '@piparotech/subkit-core'

import type { SubKitIapClient } from './SubKitIapClient.js'

export type SubKitCustomerInfoState =
  'unconfigured' | 'idle' | 'loading' | 'ready' | 'refreshing' | 'error'

export interface SubKitCustomerInfoSnapshot {
  clientConfigured: boolean
  customerInfo: CustomerInfo | null
  error: Error | null
  lastRefreshAttemptAt: number | null
  lastUpdatedAt: number | null
  state: SubKitCustomerInfoState
  version: number
}

type SubKitCustomerInfoListener = () => void

const listeners = new Set<SubKitCustomerInfoListener>()

let configuredClient: SubKitIapClient | null = null
let pendingRefresh: Promise<CustomerInfo | null> | null = null
let snapshot: SubKitCustomerInfoSnapshot = {
  clientConfigured: false,
  customerInfo: null,
  error: null,
  lastRefreshAttemptAt: null,
  lastUpdatedAt: null,
  state: 'unconfigured',
  version: 0,
}

export function configureSubKitCustomerInfoState(client: SubKitIapClient): void {
  configuredClient = client
  pendingRefresh = null
  updateSnapshot({
    clientConfigured: true,
    customerInfo: null,
    error: null,
    lastRefreshAttemptAt: null,
    lastUpdatedAt: null,
    state: 'idle',
  })
}

export function getSubKitCustomerInfoSnapshot(): SubKitCustomerInfoSnapshot {
  return snapshot
}

export function publishSubKitCustomerInfo(
  info: CustomerInfo,
  sourceClient?: SubKitIapClient,
): void {
  if (!isCurrentClient(sourceClient)) return

  updateSnapshot({
    clientConfigured: true,
    customerInfo: info,
    error: null,
    lastUpdatedAt: Date.now(),
    state: 'ready',
  })
}

export function publishSubKitCustomerInfoError(
  error: unknown,
  sourceClient?: SubKitIapClient,
): Error {
  const normalizedError = normalizeError(error)
  if (!isCurrentClient(sourceClient)) return normalizedError

  updateSnapshot({
    clientConfigured: configuredClient != null,
    error: normalizedError,
    state: configuredClient == null ? 'unconfigured' : 'error',
  })
  return normalizedError
}

export async function refreshSubKitCustomerInfo(): Promise<CustomerInfo | null> {
  const refreshClient = configuredClient
  if (refreshClient == null) {
    return null
  }

  if (pendingRefresh != null) {
    return pendingRefresh
  }

  updateSnapshot({
    error: null,
    lastRefreshAttemptAt: Date.now(),
    state: snapshot.customerInfo == null ? 'loading' : 'refreshing',
  })

  const refreshPromise = refreshClient.getCustomerInfo().finally(() => {
    if (pendingRefresh === refreshPromise) {
      pendingRefresh = null
    }
  })

  pendingRefresh = refreshPromise
  return refreshPromise
}

export function subscribeSubKitCustomerInfo(listener: SubKitCustomerInfoListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function isCurrentClient(sourceClient: SubKitIapClient | undefined): boolean {
  return sourceClient == null || sourceClient === configuredClient
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return new Error('SubKit customer info request failed')
}

function updateSnapshot(update: Omit<Partial<SubKitCustomerInfoSnapshot>, 'version'>): void {
  snapshot = {
    ...snapshot,
    ...update,
    version: snapshot.version + 1,
  }
  notifyListeners()
}

function notifyListeners(): void {
  for (const listener of listeners) {
    listener()
  }
}

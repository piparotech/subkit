import type { CustomerInfo, Offering, PurchaseResult, PurchaseSyncResult, RuntimeOfferingsResponse, StoreIdentityHints } from '@piparotech/subkit-core'

import type { SubKitIapAdapterBundle, SubKitPurchaseListenerSubscription } from './adapter.js'
import { createSubKitAppStateSync, type SubKitAppStateSource } from './appState.js'
import { SubKitRuntimeClient } from './client.js'
import { createPurchaseSyncCoordinator, type PurchaseSyncCoordinator, type SubKitIapLogger } from './coordinator.js'
import { MemoryIdentityStore } from './identity.js'
import { createMemoryPurchaseQueueStore, type PurchaseQueueStore } from './queue.js'
import type { SubKitExpoIapConfig, SubKitIapPlatform, SubKitPurchaseRequest, SubKitSyncOptions } from './types.js'

export interface CreateSubKitIapClientOptions extends SubKitExpoIapConfig {
  adapterBundle: SubKitIapAdapterBundle
  appStateSource?: SubKitAppStateSource
  installationId: string
  logger?: SubKitIapLogger
  platform: SubKitIapPlatform
  queue?: PurchaseQueueStore
  sessionId?: string
}

export interface SubKitIapClient {
  getCustomerInfo(appUserId?: string): Promise<CustomerInfo>
  getOfferings(input?: { placement?: string }): Promise<RuntimeOfferingsResponse>
  identify(appUserId: string): Promise<CustomerInfo>
  purchasePackage(packageId: string): Promise<PurchaseResult>
  restorePurchases(): Promise<PurchaseSyncResult | null>
  start(): Promise<void>
  stop(): void
  syncPurchases(input: SubKitSyncOptions): Promise<PurchaseSyncResult | null>
}

export function createSubKitIapClient(options: CreateSubKitIapClientOptions): SubKitIapClient {
  const runtime = new SubKitRuntimeClient({ apiBaseUrl: options.apiBaseUrl, appId: options.appId, sdkKey: options.sdkKey })
  const identity = new MemoryIdentityStore()
  const queue = options.queue ?? createMemoryPurchaseQueueStore()
  let customerInfo: CustomerInfo | null = null
  let offeringsCache: RuntimeOfferingsResponse | null = null
  let sessionId = options.sessionId ?? createSessionId()
  const subscriptions: SubKitPurchaseListenerSubscription[] = []
  let appStateSubscription: { remove(): void } | null = null
  let startPromise: Promise<void> | null = null

  if (options.appUserId != null && options.appUserId.trim() !== '') {
    identity.identify(options.appUserId)
  }

  const coordinator: PurchaseSyncCoordinator = createPurchaseSyncCoordinator({
    appUserId: () => identity.appUserId,
    foregroundMinIntervalMs: options.iap?.foregroundMinIntervalMs,
    iap: options.adapterBundle.iap,
    installationId: options.installationId,
    logger: options.logger,
    platform: options.platform,
    queue,
    runtime,
    sessionId: () => sessionId,
    storeIdentityHints: () => customerInfo?.storeIdentityHints ?? currentIdentityHints(identity),
  })

  async function identify(appUserId: string): Promise<CustomerInfo> {
    sessionId = createSessionId()
    const info = await runtime.getCustomerInfo(appUserId)
    customerInfo = info
    identity.identify(appUserId, info.storeIdentityHints)
    await coordinator.syncPurchases({ force: true, reason: 'identity_changed' })
    return info
  }

  async function getCustomerInfo(appUserId?: string): Promise<CustomerInfo> {
    const resolvedAppUserId = appUserId ?? identity.appUserId
    if (resolvedAppUserId == null || resolvedAppUserId.trim() === '') throw new Error('SubKit appUserId is required')
    const info = await runtime.getCustomerInfo(resolvedAppUserId)
    customerInfo = info
    identity.identify(resolvedAppUserId, info.storeIdentityHints)
    return info
  }

  async function getOfferings(input: { placement?: string } = {}): Promise<RuntimeOfferingsResponse> {
    const offerings = await runtime.getOfferings({ appUserId: identity.appUserId, placement: input.placement, platform: options.platform })
    offeringsCache = offerings
    return offerings
  }

  async function purchasePackage(packageId: string): Promise<PurchaseResult> {
    const appUserId = identity.appUserId
    if (appUserId == null || appUserId.trim() === '') {
      return { error: { code: 'missing_identity', message: 'SubKit appUserId is required before purchase', retryable: false }, status: 'failed' }
    }

    const offerings = offeringsCache ?? (await getOfferings())
    const selected = findOfferingPackage(offerings.all, packageId)
    if (selected == null) {
      return { error: { code: 'product_unavailable', message: `SubKit package ${packageId} is unavailable`, retryable: false }, status: 'failed' }
    }

    const productId = options.platform === 'ios' ? selected.product.storeProductIds.apple : selected.product.storeProductIds.google
    if (productId == null || productId.trim() === '') {
      return { error: { code: 'product_unavailable', message: `SubKit package ${packageId} has no ${options.platform} store product`, retryable: false }, status: 'failed' }
    }

    const hints = customerInfo?.storeIdentityHints ?? currentIdentityHints(identity)
    const purchaseRequest: SubKitPurchaseRequest = {
      appAccountToken: hints?.apple?.appAccountToken,
      isConsumable: selected.product.kind === 'consumable',
      obfuscatedAccountId: hints?.google?.obfuscatedAccountId,
      obfuscatedProfileId: hints?.google?.obfuscatedProfileId,
      productId,
      productType: selected.product.kind === 'subscription' ? 'subs' : 'in-app',
    }

    await options.adapterBundle.iap.initConnection()
    await options.adapterBundle.iap.requestPurchase(purchaseRequest)
    return { purchaseId: productId, status: 'pending' }
  }

  async function restorePurchases(): Promise<PurchaseSyncResult | null> {
    if (options.adapterBundle.iap.restorePurchases != null) {
      await options.adapterBundle.iap.restorePurchases()
    }
    return coordinator.syncPurchases({ force: true, reason: 'manual_restore' })
  }

  async function start(): Promise<void> {
    if (startPromise != null) {
      await startPromise
      return
    }

    const pendingStart = startOnce()
    startPromise = pendingStart
    try {
      await pendingStart
    } catch (error) {
      if (startPromise === pendingStart) startPromise = null
      throw error
    }
  }

  async function startOnce(): Promise<void> {
    await options.adapterBundle.iap.initConnection()
    const listeners = options.adapterBundle.listeners
    if (listeners != null && options.iap?.autoSync !== false && options.iap?.syncOnPurchaseEvent !== false && subscriptions.length === 0) {
      subscriptions.push(
        listeners.addPurchaseUpdatedListener((purchase) => {
          coordinator.handlePurchaseEvent(purchase).catch((error: unknown) => {
            options.logger?.error('SubKit purchase event sync failed', error)
          })
        }),
      )
      subscriptions.push(
        listeners.addPurchaseErrorListener((error) => {
          options.logger?.warn('SubKit observed IAP purchase error', error)
        }),
      )
    }

    if (options.appStateSource != null && options.iap?.autoSync !== false && options.iap?.syncOnForeground !== false && appStateSubscription == null) {
      appStateSubscription = createSubKitAppStateSync({
        appStateSource: options.appStateSource,
        logger: options.logger,
        minBackgroundDurationMs: options.iap?.sessionResumeThresholdMs,
        onBecameActive: async () => {
          sessionId = createSessionId()
          await coordinator.syncPurchases({ reason: 'foreground' })
        },
      }).start()
    }

    if (identity.appUserId != null && options.iap?.autoSync !== false && options.iap?.syncOnAppStart !== false) {
      const info = await runtime.getCustomerInfo(identity.appUserId)
      customerInfo = info
      identity.identify(identity.appUserId, info.storeIdentityHints)
      await coordinator.syncPurchases({ reason: 'app_start' })
    }
  }

  function stop(): void {
    startPromise = null
    appStateSubscription?.remove()
    appStateSubscription = null
    while (subscriptions.length > 0) {
      const subscription = subscriptions.pop()
      subscription?.remove()
    }
    options.adapterBundle.iap.endConnection?.().catch((error: unknown) => {
      options.logger?.warn('SubKit failed to end IAP connection', error)
    })
  }

  return {
    getCustomerInfo,
    getOfferings,
    identify,
    purchasePackage,
    restorePurchases,
    start,
    stop,
    syncPurchases: coordinator.syncPurchases,
  }
}

function findOfferingPackage(offerings: readonly Offering[], packageId: string): Offering['packages'][number] | null {
  for (const offering of offerings) {
    const found = offering.packages.find((item) => item.identifier === packageId || item.label === packageId)
    if (found != null) return found
  }
  return null
}

function currentIdentityHints(identity: MemoryIdentityStore): StoreIdentityHints | undefined {
  return identity.storeIdentityHints
}

let fallbackSessionCounter = 0

function createSessionId(): string {
  const randomUuid = globalThis.crypto?.randomUUID
  if (randomUuid != null) return `subkit_session_${randomUuid.call(globalThis.crypto)}`
  fallbackSessionCounter += 1
  return `subkit_session_${Date.now()}_${fallbackSessionCounter}`
}

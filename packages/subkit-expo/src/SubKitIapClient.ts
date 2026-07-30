import { Platform } from 'react-native'

import {
  type CustomerInfo,
  type DeviceManagementSession,
  type EntitlementAccessDecision,
  type Offering,
  type PurchaseResult,
  type PurchaseSyncResult,
  type RuntimeDeviceActivationResult,
  type RuntimeOfferingsResponse,
  type StoreIdentityHints,
  resolveEntitlementAccess,
} from '@piparotech/subkit-core'

import type {
  SubKitExpoIapAdapter,
  SubKitIapAdapterBundle,
  SubKitPurchaseListenerSubscription,
} from './adapter.js'
import {
  type SubKitAppStateSource,
  createReactNativeAppStateSource,
  createSubKitAppStateSync,
} from './appState.js'
import { SubKitRuntimeClient } from './client.js'
import {
  type PurchaseSyncCoordinator,
  type SubKitIapLogger,
  createPurchaseSyncCoordinator,
} from './coordinator.js'
import {
  type CustomerInfoCacheStore,
  createCustomerInfoCacheStore,
  evaluateOfflineCustomerInfo,
} from './customerInfoCache.js'
import { normalizeIapError } from './errors.js'
import { MemoryIdentityStore } from './identity.js'
import { createInstallationIdResolver } from './installationId.js'
import type { PurchaseQueueStore } from './queue.js'
import { createRedactingLogger } from './redactingLogger.js'
import { createStoredPurchaseQueueStore } from './storageQueue.js'
import {
  configureSubKitCustomerInfoState,
  isolateSubKitCustomerInfo,
  publishSubKitCustomerInfo,
  publishSubKitCustomerInfoError,
} from './subKitState.js'
import type {
  SubKitExpoIapConfig,
  SubKitIapPlatform,
  SubKitIapProduct,
  SubKitIapProductType,
  SubKitIapPurchase,
  SubKitInstallationIdInput,
  SubKitOffering,
  SubKitOfferingPackage,
  SubKitOfferingsResponse,
  SubKitPurchaseRequest,
  SubKitStoreProduct,
  SubKitSyncOptions,
} from './types.js'

declare const process: { env?: { NODE_ENV?: string } } | undefined

export interface ConfigureSubKitOptions extends SubKitExpoIapConfig {
  adapterBundle?: SubKitIapAdapterBundle
  appStateSource?: SubKitAppStateSource
  autoStart?: boolean
  customerInfoCache?: CustomerInfoCacheStore
  installationId: SubKitInstallationIdInput
  logger?: SubKitIapLogger
  platform?: SubKitIapPlatform
  queue?: PurchaseQueueStore
  sessionId?: string
}

interface ResolvedSubKitIapOptions {
  autoSync: boolean
  foregroundMinIntervalMs: number
  sessionResumeThresholdMs: number
  syncOnAppStart: boolean
  syncOnForeground: boolean
  syncOnPurchaseEvent: boolean
}

const DEFAULT_SUBKIT_API_BASE_URL = readDefaultSubKitApiBaseUrl()
const DEFAULT_SUBKIT_IAP_OPTIONS: ResolvedSubKitIapOptions = {
  autoSync: true,
  foregroundMinIntervalMs: 15 * 60 * 1000,
  sessionResumeThresholdMs: 15 * 60 * 1000,
  syncOnAppStart: true,
  syncOnForeground: true,
  syncOnPurchaseEvent: true,
}

export interface SubKitIapClient {
  getAccess(entitlementKey: string, appUserId?: string): Promise<EntitlementAccessDecision>
  getCustomerInfo(appUserId?: string): Promise<CustomerInfo>
  hasAccess(entitlementKey: string, appUserId?: string): Promise<boolean>
  getDeviceActivations(input: {
    activationGroupKey: string
    managementToken: string
  }): Promise<RuntimeDeviceActivationResult>
  getOfferings(input?: { placement?: string }): Promise<SubKitOfferingsResponse>
  identify(appUserId: string): Promise<CustomerInfo>
  purchasePackage(packageId: string): Promise<PurchaseResult>
  ready(): Promise<void>
  reset(): Promise<void>
  removeDevice(input: {
    activationGroupKey: string
    activationId: string
    idempotencyKey: string
    managementToken: string
  }): Promise<RuntimeDeviceActivationResult>
  replaceDevice(input: {
    activationGroupKey: string
    idempotencyKey: string
    managementToken: string
    replaceActivationId: string
  }): Promise<RuntimeDeviceActivationResult>
  restorePurchases(): Promise<PurchaseSyncResult | null>
  start(): Promise<void>
  stop(): void
  syncPurchases(input: SubKitSyncOptions): Promise<PurchaseSyncResult | null>
}

export function configureSubKit(options: ConfigureSubKitOptions): SubKitIapClient {
  validateConfigureSubKitOptions(options)
  configuredSubKitClient?.stop()
  const generation = configuredClientGeneration + 1
  configuredClientGeneration = generation
  const nextClient = createSubKitClient(options, generation)
  configuredSubKitClient = nextClient
  configureSubKitCustomerInfoState(nextClient)
  if (options.autoStart !== false) {
    startConfiguredSubKitClient(nextClient, options.logger)
  }
  return nextClient
}

export function getConfiguredSubKitClient(): SubKitIapClient {
  if (configuredSubKitClient == null) throwSubKitNotConfiguredError()
  return configuredSubKitClient
}

const unconfiguredClientTarget: SubKitIapClient = {
  getAccess() {
    return rejectSubKitNotConfigured()
  },
  getCustomerInfo() {
    return rejectSubKitNotConfigured()
  },
  getDeviceActivations() {
    return rejectSubKitNotConfigured()
  },
  getOfferings() {
    return rejectSubKitNotConfigured()
  },
  hasAccess() {
    return rejectSubKitNotConfigured()
  },
  identify() {
    return rejectSubKitNotConfigured()
  },
  purchasePackage() {
    return rejectSubKitNotConfigured()
  },
  ready() {
    return rejectSubKitNotConfigured()
  },
  reset() {
    return rejectSubKitNotConfigured()
  },
  removeDevice() {
    return rejectSubKitNotConfigured()
  },
  replaceDevice() {
    return rejectSubKitNotConfigured()
  },
  restorePurchases() {
    return rejectSubKitNotConfigured()
  },
  start() {
    return rejectSubKitNotConfigured()
  },
  stop() {
    throwSubKitNotConfiguredError()
  },
  syncPurchases() {
    return rejectSubKitNotConfigured()
  },
}

export const client = new Proxy(unconfiguredClientTarget, {
  get(_target, property, receiver) {
    if (property === 'then' || typeof property === 'symbol')
      return Reflect.get(unconfiguredClientTarget, property, receiver)
    const configuredClient = configuredSubKitClient
    if (configuredClient == null) throwSubKitNotConfiguredError()
    return Reflect.get(configuredClient, property, receiver)
  },
})

let configuredSubKitClient: SubKitIapClient | null = null
let configuredClientGeneration = 0

function createSubKitClient(
  options: ConfigureSubKitOptions,
  clientGeneration: number,
): SubKitIapClient {
  const adapterBundle = options.adapterBundle ?? createLazyExpoIapAdapterBundle()
  const logger = createRedactingLogger(options.logger)
  const appStateSource = options.appStateSource ?? createReactNativeAppStateSource()
  const iapOptions = resolveSubKitIapOptions(options.iap)
  const platform = options.platform ?? detectSubKitIapPlatform()
  const runtime = new SubKitRuntimeClient({
    apiBaseUrl: options.apiBaseUrl ?? DEFAULT_SUBKIT_API_BASE_URL,
    sdkKey: options.sdkKey,
  })
  const identity = new MemoryIdentityStore()
  const installationId = createInstallationIdResolver(options.installationId)
  const queue = options.queue ?? createDefaultPurchaseQueue(options)
  const customerInfoCache = options.customerInfoCache ?? createDefaultCustomerInfoCache(options)
  const deviceTokenStore = createDeviceTokenStore(options)
  let customerInfo: CustomerInfo | null = null
  let offeringsCache: SubKitOfferingsResponse | null = null
  let sessionId = options.sessionId ?? createSessionId()
  const subscriptions: SubKitPurchaseListenerSubscription[] = []
  let appStateSubscription: { remove(): void } | null = null
  let startPromise: Promise<void> | null = null
  let purchasePromise: Promise<PurchaseResult> | null = null
  let restorePromise: Promise<PurchaseSyncResult | null> | null = null
  let operationChain: Promise<unknown> = Promise.resolve()
  let stopped = false

  if (options.appUserId != null && options.appUserId.trim() !== '') {
    identity.identify(options.appUserId)
  }

  const coordinator: PurchaseSyncCoordinator = createPurchaseSyncCoordinator({
    accessContext: () => customerInfo?.accessContext?.token,
    appUserId: () => identity.appUserId,
    foregroundMinIntervalMs: iapOptions.foregroundMinIntervalMs,
    iap: adapterBundle.iap,
    identityGeneration: () => identity.generation,
    installationId: () => installationId.get(),
    logger,
    platform,
    queue,
    runtime,
    sessionId: () => sessionId,
    storeIdentityHints: () => customerInfo?.storeIdentityHints ?? currentIdentityHints(identity),
  })

  async function setCustomerInfo(
    info: CustomerInfo,
    persist = true,
    expectedGeneration = identity.generation,
  ): Promise<CustomerInfo> {
    if (expectedGeneration !== identity.generation) {
      throw new Error('SubKit discarded a stale CustomerInfo response after identity change')
    }
    customerInfo = info
    identity.identify(info.appUserId, info.storeIdentityHints)
    publishSubKitCustomerInfo(info, subKitClient)
    if (persist) {
      await customerInfoCache.write(info).catch((error: unknown) => {
        logger?.warn('SubKit failed to persist CustomerInfo', error)
      })
    }
    return info
  }

  async function hydrateCustomerInfo(appUserId: string): Promise<CustomerInfo | null> {
    try {
      const cached = await customerInfoCache.read(appUserId)
      return cached == null ? null : setCustomerInfo(cached, false)
    } catch (error) {
      logger?.warn('SubKit failed to hydrate CustomerInfo', error)
      return null
    }
  }

  async function ensureReady(): Promise<void> {
    await installationId.get()
    if (stopped || clientGeneration !== configuredClientGeneration) {
      throw new Error('SubKit client was replaced during initialization')
    }
  }

  function enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
    const previous = operationChain.catch(() => undefined)
    const pending = previous.then(operation)
    operationChain = pending.catch(() => undefined)
    return pending
  }

  async function internalSyncPurchases(
    input: SubKitSyncOptions,
  ): Promise<PurchaseSyncResult | null> {
    await ensureReady()
    const generation = identity.generation
    const result = await coordinator.syncPurchases(input)
    if (result == null) return null
    const coordinated = await coordinateDeviceAccess(result, input.reason)
    await setCustomerInfo(coordinated.customerInfo, true, generation)
    return coordinated
  }

  async function syncPurchases(input: SubKitSyncOptions): Promise<PurchaseSyncResult | null> {
    return enqueueOperation(() =>
      publishCustomerInfoErrorOnFailure(() => internalSyncPurchases(input)),
    )
  }

  async function processPurchaseEvent(
    purchase: SubKitIapPurchase,
  ): Promise<PurchaseSyncResult | null> {
    const generation = identity.generation
    const result = await coordinator.handlePurchaseEvent(purchase)
    if (result == null) return null
    const coordinated = await coordinateDeviceAccess(result, 'purchase_event')
    await setCustomerInfo(coordinated.customerInfo, true, generation)
    return coordinated
  }

  async function handlePurchaseEvent(
    purchase: SubKitIapPurchase,
  ): Promise<PurchaseSyncResult | null> {
    return enqueueOperation(() => processPurchaseEvent(purchase))
  }

  async function coordinateDeviceAccess(
    result: PurchaseSyncResult,
    reason: string,
  ): Promise<PurchaseSyncResult> {
    const managementSession = result.managementSession
    if (managementSession == null || managementSession.activationGroupKeys.length === 0) {
      return result
    }
    await deviceTokenStore.writeManagementSession(managementSession)
    let info = result.customerInfo
    for (const activationGroupKey of managementSession.activationGroupKeys) {
      const activation = await runtime.mutateDeviceActivation({
        activationGroupKey,
        idempotencyKey: `device:${reason}:${sessionId}:${activationGroupKey}`,
        installationId: await installationId.get(),
        managementToken: managementSession.token,
        operation: 'claim',
        platform,
      })
      if (activation.deviceAccessToken != null) {
        await deviceTokenStore.writeDeviceAccessToken(
          activationGroupKey,
          activation.deviceAccessToken,
        )
      }
      info = {
        ...info,
        deviceAccess: {
          accessExpiresAt: activation.deviceAccessToken?.expiresAt ?? null,
          activation: activation.activation ?? null,
          blockedReason: activation.blockedReason ?? null,
          commerciallyActive: Object.values(info.entitlements).some(
            (entitlement) => entitlement.active,
          ),
        },
      }
    }
    return { ...result, customerInfo: info }
  }

  async function identify(appUserId: string): Promise<CustomerInfo> {
    return enqueueOperation(() =>
      publishCustomerInfoErrorOnFailure(async () => {
        await ensureReady()
        sessionId = createSessionId()
        offeringsCache = null
        customerInfo = null
        identity.identify(appUserId)
        const generation = identity.generation
        isolateSubKitCustomerInfo(subKitClient)
        const hydrated = await hydrateCustomerInfo(appUserId)
        const info = await setCustomerInfo(
          await runtime.getCustomerInfo(
            appUserId,
            hydrated?.accessContext?.token,
            await deviceTokenStore.readDeviceAccessToken(),
          ),
          true,
          generation,
        )
        const result = await internalSyncPurchases({ force: true, reason: 'identity_changed' })
        return result?.customerInfo ?? info
      }),
    )
  }

  async function getAccess(
    entitlementKey: string,
    appUserId?: string,
  ): Promise<EntitlementAccessDecision> {
    return resolveEntitlementAccess(await getCustomerInfo(appUserId), entitlementKey)
  }

  async function getCustomerInfo(appUserId?: string): Promise<CustomerInfo> {
    return enqueueOperation(() =>
      publishCustomerInfoErrorOnFailure(async () => {
        await ensureReady()
        const generation = identity.generation
        const resolvedAppUserId = appUserId ?? identity.appUserId
        if (resolvedAppUserId == null || resolvedAppUserId.trim() === '')
          throw new Error('SubKit appUserId is required')
        if (customerInfo?.appUserId !== resolvedAppUserId) {
          await hydrateCustomerInfo(resolvedAppUserId)
        }
        return setCustomerInfo(
          await runtime.getCustomerInfo(
            resolvedAppUserId,
            customerInfo?.accessContext?.token,
            await deviceTokenStore.readDeviceAccessToken(),
          ),
          true,
          generation,
        )
      }),
    )
  }

  async function hasAccess(entitlementKey: string, appUserId?: string): Promise<boolean> {
    return (await getAccess(entitlementKey, appUserId)).state === 'granted'
  }

  async function getDeviceActivations(input: {
    activationGroupKey: string
    managementToken: string
  }): Promise<RuntimeDeviceActivationResult> {
    return enqueueOperation(async () => {
      await ensureReady()
      const generation = identity.generation
      const result = await runtime.listDeviceActivations(input)
      assertCurrentIdentityGeneration(generation)
      return result
    })
  }

  async function getOfferingsOnce(
    input: { placement?: string } = {},
  ): Promise<SubKitOfferingsResponse> {
    await ensureReady()
    const generation = identity.generation
    const offerings = await runtime.getOfferings({
      appUserId: identity.appUserId,
      placement: input.placement,
      platform,
    })
    const resolvedOfferings = await resolveStoreProducts({
      adapter: adapterBundle.iap,
      offerings,
      platform,
    })
    assertCurrentIdentityGeneration(generation)
    offeringsCache = resolvedOfferings
    return resolvedOfferings
  }

  async function getOfferings(
    input: { placement?: string } = {},
  ): Promise<SubKitOfferingsResponse> {
    return enqueueOperation(() => getOfferingsOnce(input))
  }

  async function purchasePackage(packageId: string): Promise<PurchaseResult> {
    if (purchasePromise != null) return purchasePromise
    const pending = enqueueOperation(() => purchasePackageOnce(packageId))
    purchasePromise = pending
    try {
      return await pending
    } finally {
      if (purchasePromise === pending) purchasePromise = null
    }
  }

  async function purchasePackageOnce(packageId: string): Promise<PurchaseResult> {
    await ensureReady()
    const generation = identity.generation
    const appUserId = identity.appUserId
    if (appUserId == null || appUserId.trim() === '') {
      return {
        error: {
          code: 'missing_identity',
          message: 'SubKit appUserId is required before purchase',
          retryable: false,
        },
        status: 'failed',
      }
    }

    const offerings = offeringsCache ?? (await getOfferingsOnce())
    const selected = findOfferingPackage(offerings.all, packageId)
    if (selected == null) {
      return {
        error: {
          code: 'product_unavailable',
          message: `SubKit package ${packageId} is unavailable`,
          retryable: false,
        },
        status: 'failed',
      }
    }

    const productId =
      platform === 'ios'
        ? selected.product.storeProductIds.apple?.productId
        : selected.product.storeProductIds.google?.productId
    if (productId == null || productId.trim() === '') {
      return {
        error: {
          code: 'product_unavailable',
          message: `SubKit package ${packageId} has no ${platform} store product`,
          retryable: false,
        },
        status: 'failed',
      }
    }

    const offerToken = await resolveGoogleOfferToken({
      adapter: adapterBundle.iap,
      basePlanId: selected.product.storeProductIds.google?.basePlanId ?? null,
      offerIds: selected.product.storeProductIds.google?.offerIds ?? [],
      platform,
      productId,
      productType: selected.product.kind === 'subscription' ? 'subs' : 'in-app',
    })
    if (offerToken === null) {
      return {
        error: {
          code: 'product_unavailable',
          message: `SubKit package ${packageId} has no eligible configured Store offer`,
          retryable: false,
        },
        status: 'failed',
      }
    }

    const hints = customerInfo?.storeIdentityHints ?? currentIdentityHints(identity)
    const purchaseRequest: SubKitPurchaseRequest = {
      appAccountToken: hints?.apple?.appAccountToken,
      isConsumable: selected.product.kind === 'consumable',
      obfuscatedAccountId: hints?.google?.obfuscatedAccountId,
      obfuscatedProfileId: hints?.google?.obfuscatedProfileId,
      offerToken: offerToken ?? undefined,
      productId,
      productType: selected.product.kind === 'subscription' ? 'subs' : 'in-app',
    }

    await adapterBundle.iap.initConnection()
    try {
      const purchases = await adapterBundle.iap.requestPurchase(purchaseRequest)
      let syncResult: PurchaseSyncResult | null = null
      for (const purchase of purchases) {
        syncResult = await processPurchaseEvent(purchase)
      }
      if (generation !== identity.generation) {
        return {
          error: {
            code: 'validation_failed',
            message: 'SubKit discarded a stale purchase result after identity change',
            retryable: false,
          },
          status: 'failed',
        }
      }
      return syncResult == null
        ? { purchaseId: productId, status: 'pending' }
        : { customerInfo: syncResult.customerInfo, status: 'verified' }
    } catch (error) {
      return purchaseResultFromIapError(error)
    }
  }

  async function replaceDevice(input: {
    activationGroupKey: string
    idempotencyKey: string
    managementToken: string
    replaceActivationId: string
  }): Promise<RuntimeDeviceActivationResult> {
    return enqueueOperation(async () => {
      await ensureReady()
      const generation = identity.generation
      const result = await runtime.mutateDeviceActivation({
        ...input,
        installationId: await installationId.get(),
        operation: 'replace',
        platform,
      })
      assertCurrentIdentityGeneration(generation)
      return result
    })
  }

  async function removeDevice(input: {
    activationGroupKey: string
    activationId: string
    idempotencyKey: string
    managementToken: string
  }): Promise<RuntimeDeviceActivationResult> {
    return enqueueOperation(async () => {
      await ensureReady()
      const generation = identity.generation
      const result = await runtime.revokeDeviceActivation(input)
      assertCurrentIdentityGeneration(generation)
      return result
    })
  }

  async function restorePurchases(): Promise<PurchaseSyncResult | null> {
    if (restorePromise != null) return restorePromise
    const pending = enqueueOperation(() =>
      publishCustomerInfoErrorOnFailure(async () => {
        await ensureReady()
        const generation = identity.generation
        if (adapterBundle.iap.restorePurchases != null) await adapterBundle.iap.restorePurchases()
        const result = await internalSyncPurchases({ force: true, reason: 'manual_restore' })
        if (generation !== identity.generation) {
          throw new Error('SubKit discarded a stale restore result after identity change')
        }
        return result
      }),
    )
    restorePromise = pending
    try {
      return await pending
    } finally {
      if (restorePromise === pending) restorePromise = null
    }
  }

  function assertCurrentIdentityGeneration(generation: number): void {
    if (generation !== identity.generation) {
      throw new Error('SubKit discarded a stale operation result after identity change')
    }
  }

  async function reset(): Promise<void> {
    await ensureReady()
    identity.reset()
    customerInfo = null
    offeringsCache = null
    sessionId = createSessionId()
    isolateSubKitCustomerInfo(subKitClient)
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
      publishSubKitCustomerInfoError(error, subKitClient)
      throw error
    }
  }

  async function startOnce(): Promise<void> {
    stopped = false
    await ensureReady()
    if (identity.appUserId != null) await hydrateCustomerInfo(identity.appUserId)
    await adapterBundle.iap.initConnection()
    const listeners = adapterBundle.listeners
    if (
      listeners != null &&
      iapOptions.autoSync &&
      iapOptions.syncOnPurchaseEvent &&
      subscriptions.length === 0
    ) {
      subscriptions.push(
        listeners.addPurchaseUpdatedListener((purchase) => {
          handlePurchaseEvent(purchase).catch((error: unknown) => {
            publishSubKitCustomerInfoError(error, subKitClient)
            logger?.error('SubKit purchase event sync failed', error)
          })
        }),
      )
      subscriptions.push(
        listeners.addPurchaseErrorListener((error) => {
          logger?.warn('SubKit observed IAP purchase error', error)
        }),
      )
    }

    if (iapOptions.autoSync && iapOptions.syncOnForeground && appStateSubscription == null) {
      appStateSubscription = createSubKitAppStateSync({
        appStateSource,
        logger,
        minBackgroundDurationMs: iapOptions.sessionResumeThresholdMs,
        onBecameActive: async () => {
          sessionId = createSessionId()
          await syncPurchases({ reason: 'foreground' })
        },
      }).start()
    }

    if (identity.appUserId != null && iapOptions.autoSync && iapOptions.syncOnAppStart) {
      await internalSyncPurchases({ reason: 'app_start' })
    }
  }

  function stop(): void {
    stopped = true
    startPromise = null
    offeringsCache = null
    appStateSubscription?.remove()
    appStateSubscription = null
    while (subscriptions.length > 0) {
      const subscription = subscriptions.pop()
      subscription?.remove()
    }
    adapterBundle.iap.endConnection?.().catch((error: unknown) => {
      logger?.warn('SubKit failed to end IAP connection', error)
    })
  }

  async function publishCustomerInfoErrorOnFailure<Result>(
    operation: () => Promise<Result>,
  ): Promise<Result> {
    try {
      return await operation()
    } catch (error) {
      if (customerInfo != null) {
        await setCustomerInfo(evaluateOfflineCustomerInfo(customerInfo), false)
      }
      publishSubKitCustomerInfoError(error, subKitClient)
      throw error
    }
  }

  const subKitClient: SubKitIapClient = {
    getAccess,
    getCustomerInfo,
    getDeviceActivations,
    getOfferings,
    hasAccess,
    identify,
    purchasePackage,
    ready: ensureReady,
    reset,
    removeDevice,
    replaceDevice,
    restorePurchases,
    start,
    stop,
    syncPurchases,
  }

  return subKitClient
}

async function resolveStoreProducts(input: {
  adapter: SubKitExpoIapAdapter
  offerings: RuntimeOfferingsResponse
  platform: SubKitIapPlatform
}): Promise<SubKitOfferingsResponse> {
  const productRequests = new Map<
    string,
    { productId: string; productType: SubKitIapProductType }
  >()
  for (const offering of input.offerings.all) {
    for (const item of offering.packages) {
      const productId = storeProductId(item, input.platform)
      if (productId == null) continue
      const productType = item.product.kind === 'subscription' ? 'subs' : 'in-app'
      productRequests.set(`${productType}:${productId}`, { productId, productType })
    }
  }

  if (productRequests.size === 0)
    return projectOfferings(input.offerings, input.platform, new Map())

  await input.adapter.initConnection()
  const products = new Map<string, SubKitIapProduct>()
  for (const productType of ['subs', 'in-app'] as const) {
    const skus = [...productRequests.values()]
      .filter((request) => request.productType === productType)
      .map((request) => request.productId)
    if (skus.length === 0) continue
    const fetched = await input.adapter.fetchProducts({
      skus: [...new Set(skus)],
      type: productType,
    })
    for (const product of fetched) products.set(`${productType}:${product.id}`, product)
  }
  return projectOfferings(input.offerings, input.platform, products)
}

function projectOfferings(
  offerings: RuntimeOfferingsResponse,
  platform: SubKitIapPlatform,
  products: ReadonlyMap<string, SubKitIapProduct>,
): SubKitOfferingsResponse {
  const all = offerings.all.map((offering) => projectOffering(offering, platform, products))
  return {
    ...offerings,
    all,
    current:
      offerings.current == null
        ? null
        : (all.find((offering) => offering.identifier === offerings.current?.identifier) ?? null),
  }
}

function projectOffering(
  offering: Offering,
  platform: SubKitIapPlatform,
  products: ReadonlyMap<string, SubKitIapProduct>,
): SubKitOffering {
  return {
    ...offering,
    packages: offering.packages.map((item) => projectOfferingPackage(item, platform, products)),
  }
}

function projectOfferingPackage(
  item: Offering['packages'][number],
  platform: SubKitIapPlatform,
  products: ReadonlyMap<string, SubKitIapProduct>,
): SubKitOfferingPackage {
  const productId = storeProductId(item, platform)
  const productType = item.product.kind === 'subscription' ? 'subs' : 'in-app'
  const product = productId == null ? undefined : products.get(`${productType}:${productId}`)
  return { ...item, storeProduct: resolveStoreProduct(item, platform, product) }
}

function resolveStoreProduct(
  item: Offering['packages'][number],
  platform: SubKitIapPlatform,
  product: SubKitIapProduct | undefined,
): SubKitStoreProduct | null {
  if (product == null) return null
  if (platform === 'android' && item.product.kind === 'subscription') {
    const basePlanId = item.product.storeProductIds.google?.basePlanId ?? null
    const offerIds = item.product.storeProductIds.google?.offerIds ?? []
    const offer = selectGoogleSubscriptionOffer(product, basePlanId, offerIds)
    if (offer?.displayPrice == null || offer.displayPrice.trim() === '') return null
    return {
      currency: offer.currency ?? product.currency,
      displayPrice: offer.displayPrice,
      price: offer.price ?? product.price,
      title: product.title,
    }
  }
  if (product.displayPrice == null || product.displayPrice.trim() === '') return null
  return {
    currency: product.currency,
    displayPrice: product.displayPrice,
    price: product.price,
    title: product.title,
  }
}

function storeProductId(
  item: Offering['packages'][number],
  platform: SubKitIapPlatform,
): string | null {
  const productId =
    platform === 'ios'
      ? item.product.storeProductIds.apple?.productId
      : item.product.storeProductIds.google?.productId
  return productId == null || productId.trim() === '' ? null : productId
}

async function resolveGoogleOfferToken(input: {
  adapter: SubKitExpoIapAdapter
  basePlanId: string | null
  offerIds: readonly string[]
  platform: SubKitIapPlatform
  productId: string
  productType: SubKitPurchaseRequest['productType']
}): Promise<string | null | undefined> {
  if (input.platform !== 'android' || input.productType !== 'subs') return undefined
  const products = await input.adapter.fetchProducts({
    skus: [input.productId],
    type: input.productType,
  })
  const product = products.find((candidate) => candidate.id === input.productId)
  if (product == null) return null
  const offer = selectGoogleSubscriptionOffer(product, input.basePlanId, input.offerIds)
  return offer?.offerToken ?? null
}

function selectGoogleSubscriptionOffer(
  product: SubKitIapProduct,
  basePlanId: string | null,
  offerIds: readonly string[],
): NonNullable<SubKitIapProduct['subscriptionOffers']>[number] | undefined {
  const offers = product.subscriptionOffers ?? []
  const configuredOffer = offers.find(
    (offer) =>
      offerIds.includes(offer.id) &&
      (basePlanId == null || offer.basePlanId == null || offer.basePlanId === basePlanId),
  )
  if (configuredOffer != null) return configuredOffer
  if (offerIds.length > 0) return undefined
  return offers.find(
    (offer) =>
      (basePlanId == null || offer.basePlanId == null || offer.basePlanId === basePlanId) &&
      offer.offerToken != null,
  )
}

interface DeviceTokenStore {
  readDeviceAccessToken(): Promise<string | undefined>
  writeDeviceAccessToken(
    activationGroupKey: string,
    token: { expiresAt: string; token: string },
  ): Promise<void>
  writeManagementSession(session: DeviceManagementSession): Promise<void>
}

function createDeviceTokenStore(options: ConfigureSubKitOptions): DeviceTokenStore {
  const persistence = requirePersistence(options)
  const prefix = `${persistence.keyPrefix}:device-tokens:v1`
  return {
    async readDeviceAccessToken() {
      const index = await persistence.storage.getItem(`${prefix}:access:current`)
      if (index == null) return undefined
      const raw = await persistence.storage.getItem(`${prefix}:access:${encodeURIComponent(index)}`)
      if (raw == null) return undefined
      try {
        const parsed: unknown = JSON.parse(raw)
        if (
          typeof parsed === 'object' &&
          parsed != null &&
          'token' in parsed &&
          typeof parsed.token === 'string'
        )
          return parsed.token
      } catch {
        return undefined
      }
      return undefined
    },
    async writeDeviceAccessToken(activationGroupKey, token) {
      await persistence.storage.setItem(
        `${prefix}:access:${encodeURIComponent(activationGroupKey)}`,
        JSON.stringify(token),
      )
      await persistence.storage.setItem(`${prefix}:access:current`, activationGroupKey)
    },
    async writeManagementSession(session) {
      await persistence.storage.setItem(`${prefix}:management`, JSON.stringify(session))
    },
  }
}

function createDefaultPurchaseQueue(options: ConfigureSubKitOptions): PurchaseQueueStore {
  const persistence = requirePersistence(options)
  return createStoredPurchaseQueueStore({
    key: `${persistence.keyPrefix}:purchase-queue:v1`,
    storage: persistence.storage,
  })
}

function createDefaultCustomerInfoCache(options: ConfigureSubKitOptions): CustomerInfoCacheStore {
  const persistence = requirePersistence(options)
  return createCustomerInfoCacheStore({
    keyPrefix: `${persistence.keyPrefix}:customer-info:v1`,
    policy: options.iap,
    storage: persistence.storage,
  })
}

function requirePersistence(options: ConfigureSubKitOptions): {
  keyPrefix: string
  storage: NonNullable<ConfigureSubKitOptions['persistence']>['storage']
} {
  const persistence = options.persistence
  if (persistence == null) {
    if (options.adapterBundle != null) {
      return {
        keyPrefix: `subkit:test:${hashStorageScope(options.sdkKey)}`,
        storage: testPersistenceStorage,
      }
    }
    throw new Error(
      'SubKit persistence.storage is required unless custom queue and customerInfoCache stores are provided',
    )
  }
  const keyPrefix = persistence.keyPrefix?.trim() || `subkit:${hashStorageScope(options.sdkKey)}`
  return { keyPrefix, storage: persistence.storage }
}

const testPersistenceValues = new Map<string, string>()
const testPersistenceStorage: NonNullable<ConfigureSubKitOptions['persistence']>['storage'] = {
  async getItem(key) {
    return testPersistenceValues.get(key) ?? null
  },
  async removeItem(key) {
    testPersistenceValues.delete(key)
  },
  async setItem(key, value) {
    testPersistenceValues.set(key, value)
  },
}

function hashStorageScope(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function findOfferingPackage(
  offerings: readonly Offering[],
  packageId: string,
): Offering['packages'][number] | null {
  for (const offering of offerings) {
    const found = offering.packages.find(
      (item) => item.identifier === packageId || item.label === packageId,
    )
    if (found != null) return found
  }
  return null
}

function currentIdentityHints(identity: MemoryIdentityStore): StoreIdentityHints | undefined {
  return identity.storeIdentityHints
}

async function startConfiguredSubKitClient(
  nextClient: SubKitIapClient,
  logger: SubKitIapLogger | undefined,
): Promise<void> {
  try {
    await nextClient.start()
  } catch (error) {
    if (logger != null) {
      logger.error('SubKit auto-start failed', error)
      return
    }
    console.error('SubKit auto-start failed', error)
  }
}

function rejectSubKitNotConfigured<Result>(): Promise<Result> {
  return Promise.reject(createSubKitNotConfiguredError())
}

function throwSubKitNotConfiguredError(): never {
  throw createSubKitNotConfiguredError()
}

function createSubKitNotConfiguredError(): Error {
  return new Error('SubKit is not configured. Call configureSubKit(...) before accessing client.')
}

function resolveSubKitIapOptions(options: ConfigureSubKitOptions['iap']): ResolvedSubKitIapOptions {
  return {
    autoSync: options?.autoSync ?? DEFAULT_SUBKIT_IAP_OPTIONS.autoSync,
    foregroundMinIntervalMs:
      options?.foregroundMinIntervalMs ?? DEFAULT_SUBKIT_IAP_OPTIONS.foregroundMinIntervalMs,
    sessionResumeThresholdMs:
      options?.sessionResumeThresholdMs ?? DEFAULT_SUBKIT_IAP_OPTIONS.sessionResumeThresholdMs,
    syncOnAppStart: options?.syncOnAppStart ?? DEFAULT_SUBKIT_IAP_OPTIONS.syncOnAppStart,
    syncOnForeground: options?.syncOnForeground ?? DEFAULT_SUBKIT_IAP_OPTIONS.syncOnForeground,
    syncOnPurchaseEvent:
      options?.syncOnPurchaseEvent ?? DEFAULT_SUBKIT_IAP_OPTIONS.syncOnPurchaseEvent,
  }
}

function detectSubKitIapPlatform(): SubKitIapPlatform {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  throw new Error(`SubKit IAP only supports iOS and Android, got ${Platform.OS}`)
}

function validateConfigureSubKitOptions(options: ConfigureSubKitOptions): void {
  if (options.sdkKey.trim() === '') {
    throw new Error('SubKit sdkKey is required')
  }
  if (typeof options.installationId === 'string' && options.installationId.trim() === '') {
    throw new Error('SubKit installationId is required')
  }
  if (
    options.adapterBundle == null &&
    options.persistence == null &&
    (options.queue == null || options.customerInfoCache == null)
  ) {
    throw new Error(
      'SubKit persistence.storage is required unless custom queue and customerInfoCache stores are provided',
    )
  }
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_SUBKIT_API_BASE_URL
  try {
    const parsed = new URL(apiBaseUrl)
    if (
      parsed.protocol !== 'https:' &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1'
    ) {
      throw new Error('SubKit apiBaseUrl must use HTTPS outside local development')
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'SubKit apiBaseUrl must use HTTPS outside local development'
    )
      throw error
    throw new Error('SubKit apiBaseUrl must be a valid URL')
  }
}

function purchaseResultFromIapError(error: unknown): PurchaseResult {
  const normalized = normalizeIapError(error)
  if (isCancelledIapError(normalized.code, normalized.message)) return { status: 'cancelled' }
  return {
    error: {
      code: normalized.code ?? 'store_unavailable',
      message: normalized.message,
      retryable: true,
    },
    status: 'failed',
  }
}

function isCancelledIapError(code: string | undefined, message: string): boolean {
  const normalizedCode = code?.toLowerCase() ?? ''
  const normalizedMessage = message.toLowerCase()
  return (
    normalizedCode.includes('cancel') ||
    normalizedMessage.includes('cancel') ||
    normalizedCode === 'user_cancelled'
  )
}

function createLazyExpoIapAdapterBundle(): SubKitIapAdapterBundle {
  let loadedBundle: SubKitIapAdapterBundle | null = null
  let loadPromise: Promise<SubKitIapAdapterBundle> | null = null

  async function loadBundle(): Promise<SubKitIapAdapterBundle> {
    if (loadedBundle != null) return loadedBundle
    if (loadPromise == null) {
      loadPromise = import('./expoIapAdapter.js').then((module) => module.createExpoIapAdapter())
    }
    loadedBundle = await loadPromise
    return loadedBundle
  }

  const iap: SubKitExpoIapAdapter = {
    async endConnection() {
      const bundle = await loadBundle()
      await bundle.iap.endConnection?.()
    },
    async fetchProducts(input) {
      const bundle = await loadBundle()
      return bundle.iap.fetchProducts(input)
    },
    async finishTransaction(input) {
      const bundle = await loadBundle()
      return bundle.iap.finishTransaction(input)
    },
    async getAvailablePurchases() {
      const bundle = await loadBundle()
      return bundle.iap.getAvailablePurchases()
    },
    async initConnection() {
      const bundle = await loadBundle()
      return bundle.iap.initConnection()
    },
    async requestPurchase(input) {
      const bundle = await loadBundle()
      return bundle.iap.requestPurchase(input)
    },
    async restorePurchases() {
      const bundle = await loadBundle()
      await bundle.iap.restorePurchases?.()
    },
  }

  return {
    iap,
    listeners: {
      addPurchaseErrorListener(listener) {
        return createLazyListenerSubscription(loadBundle, (bundle) =>
          bundle.listeners?.addPurchaseErrorListener(listener),
        )
      },
      addPurchaseUpdatedListener(listener) {
        return createLazyListenerSubscription(loadBundle, (bundle) =>
          bundle.listeners?.addPurchaseUpdatedListener(listener),
        )
      },
    },
  }
}

function createLazyListenerSubscription(
  loadBundle: () => Promise<SubKitIapAdapterBundle>,
  subscribe: (bundle: SubKitIapAdapterBundle) => SubKitPurchaseListenerSubscription | undefined,
): SubKitPurchaseListenerSubscription {
  let removed = false
  let subscription: SubKitPurchaseListenerSubscription | undefined
  loadBundle()
    .then((bundle) => {
      if (removed) return
      subscription = subscribe(bundle)
      if (removed) subscription?.remove()
    })
    .catch(() => undefined)
  return {
    remove() {
      removed = true
      subscription?.remove()
    },
  }
}

function readDefaultSubKitApiBaseUrl(): string {
  return 'https://subkit.piparo.tech'
}

let fallbackSessionCounter = 0

function createSessionId(): string {
  const randomUuid = globalThis.crypto?.randomUUID
  if (randomUuid != null) return `subkit_session_${randomUuid.call(globalThis.crypto)}`
  fallbackSessionCounter += 1
  return `subkit_session_${Date.now()}_${fallbackSessionCounter}`
}

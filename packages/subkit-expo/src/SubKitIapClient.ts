import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

import type {
  CustomerInfo,
  Offering,
  PurchaseResult,
  PurchaseSyncResult,
  RuntimeOfferingsResponse,
  StoreIdentityHints,
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
import type { PurchaseQueueStore } from './queue.js'
import { createStoredPurchaseQueueStore } from './storageQueue.js'
import {
  configureSubKitCustomerInfoState,
  publishSubKitCustomerInfo,
  publishSubKitCustomerInfoError,
} from './subKitState.js'
import type {
  SubKitExpoIapConfig,
  SubKitIapPlatform,
  SubKitIapProduct,
  SubKitIapPurchase,
  SubKitPurchaseRequest,
  SubKitSyncOptions,
} from './types.js'

export interface ConfigureSubKitOptions extends SubKitExpoIapConfig {
  adapterBundle?: SubKitIapAdapterBundle
  appStateSource?: SubKitAppStateSource
  autoStart?: boolean
  customerInfoCache?: CustomerInfoCacheStore
  installationId: string
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
  getCustomerInfo(appUserId?: string): Promise<CustomerInfo>
  getOfferings(input?: { placement?: string }): Promise<RuntimeOfferingsResponse>
  identify(appUserId: string): Promise<CustomerInfo>
  purchasePackage(packageId: string): Promise<PurchaseResult>
  restorePurchases(): Promise<PurchaseSyncResult | null>
  start(): Promise<void>
  stop(): void
  syncPurchases(input: SubKitSyncOptions): Promise<PurchaseSyncResult | null>
}

export function configureSubKit(options: ConfigureSubKitOptions): SubKitIapClient {
  validateConfigureSubKitOptions(options)
  configuredSubKitClient?.stop()
  const nextClient = createSubKitClient(options)
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
  getCustomerInfo() {
    return rejectSubKitNotConfigured()
  },
  getOfferings() {
    return rejectSubKitNotConfigured()
  },
  identify() {
    return rejectSubKitNotConfigured()
  },
  purchasePackage() {
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

function createSubKitClient(options: ConfigureSubKitOptions): SubKitIapClient {
  const adapterBundle = options.adapterBundle ?? createLazyExpoIapAdapterBundle()
  const appStateSource = options.appStateSource ?? createReactNativeAppStateSource()
  const iapOptions = resolveSubKitIapOptions(options.iap)
  const platform = options.platform ?? detectSubKitIapPlatform()
  const credential = createRuntimeCredentialResolver(options, adapterBundle.iap, platform)
  const runtime = new SubKitRuntimeClient({
    apiBaseUrl: options.apiBaseUrl ?? DEFAULT_SUBKIT_API_BASE_URL,
    sdkKey: credential.resolveKey,
  })
  const identity = new MemoryIdentityStore()
  const queue = options.queue ?? createDefaultPurchaseQueue(options, credential)
  const customerInfoCache =
    options.customerInfoCache ?? createDefaultCustomerInfoCache(options, credential)
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
    foregroundMinIntervalMs: iapOptions.foregroundMinIntervalMs,
    iap: adapterBundle.iap,
    installationId: options.installationId,
    logger: options.logger,
    platform,
    queue,
    runtime,
    sessionId: () => sessionId,
    storeIdentityHints: () => customerInfo?.storeIdentityHints ?? currentIdentityHints(identity),
  })

  async function setCustomerInfo(info: CustomerInfo, persist = true): Promise<CustomerInfo> {
    customerInfo = info
    identity.identify(info.appUserId, info.storeIdentityHints)
    publishSubKitCustomerInfo(info, subKitClient)
    if (persist) {
      await customerInfoCache.write(info).catch((error: unknown) => {
        options.logger?.warn('SubKit failed to persist CustomerInfo', error)
      })
    }
    return info
  }

  async function hydrateCustomerInfo(appUserId: string): Promise<CustomerInfo | null> {
    try {
      const cached = await customerInfoCache.read(appUserId)
      return cached == null ? null : setCustomerInfo(cached, false)
    } catch (error) {
      options.logger?.warn('SubKit failed to hydrate CustomerInfo', error)
      return null
    }
  }

  async function internalSyncPurchases(
    input: SubKitSyncOptions,
  ): Promise<PurchaseSyncResult | null> {
    const result = await coordinator.syncPurchases(input)
    if (result != null) await setCustomerInfo(result.customerInfo)
    return result
  }

  async function syncPurchases(input: SubKitSyncOptions): Promise<PurchaseSyncResult | null> {
    return publishCustomerInfoErrorOnFailure(() => internalSyncPurchases(input))
  }

  async function handlePurchaseEvent(purchase: SubKitIapPurchase): Promise<void> {
    const result = await coordinator.handlePurchaseEvent(purchase)
    if (result != null) await setCustomerInfo(result.customerInfo)
  }

  async function identify(appUserId: string): Promise<CustomerInfo> {
    return publishCustomerInfoErrorOnFailure(async () => {
      sessionId = createSessionId()
      offeringsCache = null
      identity.identify(appUserId)
      await hydrateCustomerInfo(appUserId)
      const info = await setCustomerInfo(await runtime.getCustomerInfo(appUserId))
      const result = await internalSyncPurchases({ force: true, reason: 'identity_changed' })
      return result?.customerInfo ?? info
    })
  }

  async function getCustomerInfo(appUserId?: string): Promise<CustomerInfo> {
    return publishCustomerInfoErrorOnFailure(async () => {
      const resolvedAppUserId = appUserId ?? identity.appUserId
      if (resolvedAppUserId == null || resolvedAppUserId.trim() === '')
        throw new Error('SubKit appUserId is required')
      if (customerInfo?.appUserId !== resolvedAppUserId) {
        await hydrateCustomerInfo(resolvedAppUserId)
      }
      return setCustomerInfo(await runtime.getCustomerInfo(resolvedAppUserId))
    })
  }

  async function getOfferings(
    input: { placement?: string } = {},
  ): Promise<RuntimeOfferingsResponse> {
    const offerings = await runtime.getOfferings({
      appUserId: identity.appUserId,
      placement: input.placement,
      platform,
    })
    if (input.placement == null) offeringsCache = offerings
    return offerings
  }

  async function purchasePackage(packageId: string): Promise<PurchaseResult> {
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

    const offerings = offeringsCache ?? (await getOfferings())
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
      await adapterBundle.iap.requestPurchase(purchaseRequest)
      return { purchaseId: productId, status: 'pending' }
    } catch (error) {
      return purchaseResultFromIapError(error)
    }
  }

  async function restorePurchases(): Promise<PurchaseSyncResult | null> {
    return publishCustomerInfoErrorOnFailure(async () => {
      if (adapterBundle.iap.restorePurchases != null) {
        await adapterBundle.iap.restorePurchases()
      }
      return internalSyncPurchases({ force: true, reason: 'manual_restore' })
    })
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

    if (iapOptions.autoSync && iapOptions.syncOnForeground && appStateSubscription == null) {
      appStateSubscription = createSubKitAppStateSync({
        appStateSource,
        logger: options.logger,
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
    startPromise = null
    offeringsCache = null
    appStateSubscription?.remove()
    appStateSubscription = null
    while (subscriptions.length > 0) {
      const subscription = subscriptions.pop()
      subscription?.remove()
    }
    adapterBundle.iap.endConnection?.().catch((error: unknown) => {
      options.logger?.warn('SubKit failed to end IAP connection', error)
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
    getCustomerInfo,
    getOfferings,
    identify,
    purchasePackage,
    restorePurchases,
    start,
    stop,
    syncPurchases,
  }

  return subKitClient
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

interface RuntimeCredentialResolver {
  resolveEnvironment(): Promise<'production' | 'sandbox'>
  resolveKey(): Promise<string>
}

function createRuntimeCredentialResolver(
  options: ConfigureSubKitOptions,
  adapter: SubKitExpoIapAdapter,
  platform: SubKitIapPlatform,
): RuntimeCredentialResolver {
  if (options.sdkKey != null) {
    return {
      async resolveEnvironment() {
        return 'production'
      },
      async resolveKey() {
        return options.sdkKey ?? ''
      },
    }
  }

  let environmentPromise: Promise<'production' | 'sandbox'> | null = null
  const resolveEnvironment = async (): Promise<'production' | 'sandbox'> => {
    if (environmentPromise == null) {
      environmentPromise = (async () => {
        await adapter.initConnection()
        const environment = await adapter.detectEnvironment?.()
        if (environment !== 'production' && environment !== 'sandbox') {
          throw new Error(
            `SubKit could not derive a trusted ${platform} Store environment for Runtime credential selection`,
          )
        }
        return environment
      })()
    }
    return environmentPromise
  }

  return {
    resolveEnvironment,
    async resolveKey() {
      const environment = await resolveEnvironment()
      const key = options.sdkKeys?.[environment]
      if (key == null || key.trim() === '') {
        throw new Error(`SubKit ${environment} sdkKey is required`)
      }
      return key
    },
  }
}

function createDefaultPurchaseQueue(
  options: ConfigureSubKitOptions,
  credential: RuntimeCredentialResolver,
): PurchaseQueueStore {
  const stores = createEnvironmentStores(options, (key) =>
    createStoredPurchaseQueueStore({
      key: `subkit:iap:purchase-queue:v1:${key}`,
      storage: AsyncStorage,
    }),
  )
  return {
    async enqueue(purchase, appUserId) {
      return (await stores.current(credential)).enqueue(purchase, appUserId)
    },
    async enqueueMany(purchases, appUserId) {
      return (await stores.current(credential)).enqueueMany(purchases, appUserId)
    },
    async listPending(appUserId) {
      return (await stores.current(credential)).listPending(appUserId)
    },
    async markFailed(id, error) {
      return (await stores.current(credential)).markFailed(id, error)
    },
    async markFinished(id) {
      return (await stores.current(credential)).markFinished(id)
    },
    async markRejected(id, error) {
      return (await stores.current(credential)).markRejected(id, error)
    },
    async markVerified(id) {
      return (await stores.current(credential)).markVerified(id)
    },
  }
}

function createDefaultCustomerInfoCache(
  options: ConfigureSubKitOptions,
  credential: RuntimeCredentialResolver,
): CustomerInfoCacheStore {
  const stores = createEnvironmentStores(options, (key) =>
    createCustomerInfoCacheStore({
      keyPrefix: `subkit:customer-info:v1:${key}`,
      policy: options.iap,
      storage: AsyncStorage,
    }),
  )
  return {
    async read(appUserId) {
      return (await stores.current(credential)).read(appUserId)
    },
    async write(info) {
      return (await stores.current(credential)).write(info)
    },
  }
}

function createEnvironmentStores<Store>(
  options: ConfigureSubKitOptions,
  create: (key: string) => Store,
): { current(credential: RuntimeCredentialResolver): Promise<Store> } {
  const singleKey = options.sdkKey
  if (singleKey != null) {
    const store = create(hashStorageScope(`${singleKey}:${options.installationId}`))
    return {
      async current() {
        return store
      },
    }
  }
  const production = create(
    hashStorageScope(`${options.sdkKeys?.production ?? ''}:${options.installationId}`),
  )
  const sandbox = create(
    hashStorageScope(`${options.sdkKeys?.sandbox ?? ''}:${options.installationId}`),
  )
  return {
    async current(credential) {
      return (await credential.resolveEnvironment()) === 'production' ? production : sandbox
    },
  }
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
  if (options.sdkKey != null && options.sdkKeys != null) {
    throw new Error('Configure SubKit with sdkKey or sdkKeys, not both')
  }
  if (options.sdkKey == null && options.sdkKeys == null) {
    throw new Error('SubKit sdkKey or sdkKeys are required')
  }
  if (options.sdkKey != null && options.sdkKey.trim() === '') {
    throw new Error('SubKit sdkKey is required')
  }
  if (
    options.sdkKeys != null &&
    (options.sdkKeys.production.trim() === '' || options.sdkKeys.sandbox.trim() === '')
  ) {
    throw new Error('SubKit production and sandbox sdkKeys are required')
  }
  if (options.installationId.trim() === '') throw new Error('SubKit installationId is required')
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
    async detectEnvironment() {
      const bundle = await loadBundle()
      return (await bundle.iap.detectEnvironment?.()) ?? 'unknown'
    },
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

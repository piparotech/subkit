import type {
  PurchaseOwnershipConflict,
  PurchaseSyncReason,
  PurchaseSyncResult,
  RejectedPurchase,
  StoreIdentityHints,
} from '@piparotech/subkit-core'

import type { SubKitExpoIapAdapter } from './adapter.js'
import { type SubKitRuntimeClient, normalizePurchaseForReconcile } from './client.js'
import type { PurchaseQueueItem, PurchaseQueueStore } from './queue.js'
import type { SubKitIapPurchase } from './types.js'

export interface SubKitIapLogger {
  debug(message: string, context?: unknown): void
  error(message: string, context?: unknown): void
  warn(message: string, context?: unknown): void
}

export interface PurchaseSyncCoordinatorOptions {
  accessContext?: () => string | undefined
  appUserId: () => string | undefined
  foregroundMinIntervalMs?: number
  identityGeneration: () => number
  installationId: string | (() => Promise<string>)
  iap: SubKitExpoIapAdapter
  logger?: SubKitIapLogger
  platform: 'ios' | 'android'
  queue: PurchaseQueueStore
  runtime: SubKitRuntimeClient
  sessionId: () => string
  storeIdentityHints: () => StoreIdentityHints | undefined
}

export interface PurchaseSyncCoordinator {
  handlePurchaseEvent(purchase: SubKitIapPurchase): Promise<PurchaseSyncResult | null>
  syncPurchases(input: {
    force?: boolean
    reason: PurchaseSyncReason
  }): Promise<PurchaseSyncResult | null>
}

export function createPurchaseSyncCoordinator(
  options: PurchaseSyncCoordinatorOptions,
): PurchaseSyncCoordinator {
  let lastForegroundSyncAt = 0
  let syncChain: Promise<PurchaseSyncResult | null> = Promise.resolve(null)
  const foregroundMinIntervalMs = options.foregroundMinIntervalMs ?? 15 * 60 * 1000

  async function syncPurchases(input: {
    force?: boolean
    reason: PurchaseSyncReason
  }): Promise<PurchaseSyncResult | null> {
    const appUserId = normalizeAppUserId(options.appUserId())
    if (appUserId == null) {
      options.logger?.debug('Skipping SubKit IAP sync without app user id', {
        reason: input.reason,
      })
      return null
    }

    const now = Date.now()
    if (
      input.reason === 'foreground' &&
      input.force !== true &&
      now - lastForegroundSyncAt < foregroundMinIntervalMs
    ) {
      return null
    }

    return enqueueSync(async () => {
      const binding = await currentQueueBinding(appUserId)
      await options.iap.initConnection()
      const availablePurchases = await options.iap.getAvailablePurchases()
      await options.queue.enqueueMany(availablePurchases, binding)
      const result = await drainQueue(input.reason, binding)
      if (input.reason === 'foreground') lastForegroundSyncAt = now
      return result
    })
  }

  async function handlePurchaseEvent(
    purchase: SubKitIapPurchase,
  ): Promise<PurchaseSyncResult | null> {
    const appUserId = normalizeAppUserId(options.appUserId())
    if (appUserId == null) return null
    const binding = await currentQueueBinding(appUserId)
    await options.queue.enqueue(purchase, binding)
    return enqueueSync(() => drainQueue('purchase_event', binding))
  }

  function enqueueSync(
    task: () => Promise<PurchaseSyncResult | null>,
  ): Promise<PurchaseSyncResult | null> {
    const previous = syncChain.catch(() => null)
    const next = previous.then(task)
    syncChain = next.catch(() => null)
    return next
  }

  async function drainQueue(
    reason: PurchaseSyncReason,
    binding: { appUserId: string; identityGeneration: number; installationId: string },
  ): Promise<PurchaseSyncResult> {
    const pending = await options.queue.listPending(binding)
    const purchases = pending.map((item) =>
      normalizePurchaseForReconcile(queueItemToPurchase(item)),
    )

    const result = await options.runtime.reconcile({
      accessContext: options.accessContext?.(),
      appUserId: binding.appUserId,
      installationId: binding.installationId,
      platform: options.platform,
      purchases,
      reason,
      sessionId: options.sessionId(),
      storeIdentities: options.storeIdentityHints(),
    })
    await assertBindingIsCurrent(binding)

    for (const rejected of result.rejectedPurchases) {
      const item = findQueueItemForRejectedPurchase(pending, rejected)
      if (item != null) await options.queue.markRejected(item.id, rejected.message)
    }

    for (const conflict of result.conflicts) {
      const item = findQueueItemForOwnershipConflict(pending, conflict)
      if (item != null) await options.queue.markRejected(item.id, conflict.reason)
    }

    for (const transaction of result.finishableTransactions) {
      const item = pending.find((candidate) => candidate.id === transaction.purchaseId)
      if (item == null) continue
      await options.queue.markVerified(item.id)
      try {
        await options.iap.finishTransaction({
          isConsumable: transaction.isConsumable,
          purchase: queueItemToPurchase(item),
        })
        await options.queue.markFinished(item.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to finish transaction'
        await options.queue.markFailed(item.id, message)
        options.logger?.warn('SubKit failed to finish transaction after verification', {
          error,
          itemId: item.id,
        })
      }
    }

    return result
  }

  async function currentQueueBinding(appUserId: string) {
    return {
      appUserId,
      identityGeneration: options.identityGeneration(),
      installationId:
        typeof options.installationId === 'string'
          ? options.installationId
          : await options.installationId(),
    }
  }

  async function assertBindingIsCurrent(binding: {
    appUserId: string
    identityGeneration: number
    installationId: string
  }): Promise<void> {
    const currentAppUserId = normalizeAppUserId(options.appUserId())
    const currentInstallationId =
      typeof options.installationId === 'string'
        ? options.installationId
        : await options.installationId()
    if (
      currentAppUserId !== binding.appUserId ||
      options.identityGeneration() !== binding.identityGeneration ||
      currentInstallationId !== binding.installationId
    ) {
      throw new Error('SubKit discarded a stale reconcile result after identity changed')
    }
  }

  return { handlePurchaseEvent, syncPurchases }
}

function queueItemToPurchase(item: PurchaseQueueItem): SubKitIapPurchase {
  return {
    environment: item.environment,
    linkedPurchaseToken: item.linkedPurchaseToken,
    orderId: item.orderId,
    originalTransactionId: item.originalTransactionId,
    ownershipType: item.ownershipType,
    productId: item.productId,
    purchaseToken: item.purchaseToken,
    quantity: item.quantity,
    raw: item.rawPurchase,
    receipt: item.receipt,
    store: item.store,
    transactionDate: item.purchaseTime,
    transactionId: item.transactionId,
  }
}

function findQueueItemForRejectedPurchase(
  items: readonly PurchaseQueueItem[],
  rejected: RejectedPurchase,
): PurchaseQueueItem | undefined {
  return items.find(
    (item) =>
      item.store === rejected.store &&
      item.productId === rejected.storeProductId &&
      queueItemTransactionIdentifier(item) === rejected.transactionId,
  )
}

function findQueueItemForOwnershipConflict(
  items: readonly PurchaseQueueItem[],
  conflict: PurchaseOwnershipConflict,
): PurchaseQueueItem | undefined {
  return items.find(
    (item) =>
      item.store === conflict.store &&
      item.productId === conflict.storeProductId &&
      queueItemTransactionIdentifier(item) === conflict.transactionId,
  )
}

function queueItemTransactionIdentifier(item: PurchaseQueueItem): string | null {
  return item.transactionId ?? item.purchaseToken ?? item.orderId ?? null
}

function normalizeAppUserId(appUserId: string | undefined): string | undefined {
  if (appUserId == null) return undefined
  const trimmed = appUserId.trim()
  return trimmed === '' ? undefined : trimmed
}

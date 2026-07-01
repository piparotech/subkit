import type { PurchaseSyncReason, PurchaseSyncResult, StoreIdentityHints } from '@piparotech/subkit-core'

import type { SubKitExpoIapAdapter } from './adapter.js'
import { normalizePurchaseForReconcile, type SubKitRuntimeClient } from './client.js'
import type { PurchaseQueueStore } from './queue.js'
import type { SubKitIapPurchase } from './types.js'

export interface SubKitIapLogger {
  debug(message: string, context?: unknown): void
  error(message: string, context?: unknown): void
  warn(message: string, context?: unknown): void
}

export interface PurchaseSyncCoordinatorOptions {
  appUserId: () => string | undefined
  foregroundMinIntervalMs?: number
  installationId: string
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
  syncPurchases(input: { force?: boolean; reason: PurchaseSyncReason }): Promise<PurchaseSyncResult | null>
}

export function createPurchaseSyncCoordinator(options: PurchaseSyncCoordinatorOptions): PurchaseSyncCoordinator {
  let syncInProgress = false
  let lastForegroundSyncAt = 0
  const foregroundMinIntervalMs = options.foregroundMinIntervalMs ?? 15 * 60 * 1000

  async function syncPurchases(input: { force?: boolean; reason: PurchaseSyncReason }): Promise<PurchaseSyncResult | null> {
    const appUserId = options.appUserId()
    if (appUserId == null || appUserId.trim() === '') {
      options.logger?.debug('Skipping SubKit IAP sync without app user id', { reason: input.reason })
      return null
    }

    const now = Date.now()
    if (input.reason === 'foreground' && input.force !== true && now - lastForegroundSyncAt < foregroundMinIntervalMs) {
      return null
    }

    if (syncInProgress) return null
    syncInProgress = true

    try {
      await options.iap.initConnection()
      const availablePurchases = await options.iap.getAvailablePurchases()
      for (const purchase of availablePurchases) {
        await options.queue.enqueue(purchase, appUserId)
      }
      const result = await drainQueue(input.reason, appUserId)
      if (input.reason === 'foreground') lastForegroundSyncAt = now
      return result
    } finally {
      syncInProgress = false
    }
  }

  async function handlePurchaseEvent(purchase: SubKitIapPurchase): Promise<PurchaseSyncResult | null> {
    const appUserId = options.appUserId()
    await options.queue.enqueue(purchase, appUserId)
    if (appUserId == null || appUserId.trim() === '') return null
    return drainQueue('purchase_event', appUserId)
  }

  async function drainQueue(reason: PurchaseSyncReason, appUserId: string): Promise<PurchaseSyncResult> {
    const pending = await options.queue.listPending(appUserId)
    const purchases = pending.map((item) => normalizePurchaseForReconcile({
      environment: undefined,
      originalTransactionId: item.originalTransactionId,
      productId: item.productId,
      purchaseToken: item.purchaseToken,
      raw: item.rawPurchase,
      store: item.store,
      transactionDate: item.purchaseTime,
      transactionId: item.transactionId,
    }))

    const result = await options.runtime.reconcile({
      appUserId,
      installationId: options.installationId,
      platform: options.platform,
      purchases,
      reason,
      sessionId: options.sessionId(),
      storeIdentities: options.storeIdentityHints(),
    })

    for (const transaction of result.finishableTransactions) {
      const item = pending.find((candidate) => candidate.id === transaction.purchaseId)
      if (item == null) continue
      await options.queue.markVerified(item.id)
      try {
        await options.iap.finishTransaction({
          isConsumable: transaction.isConsumable,
          purchase: {
            originalTransactionId: item.originalTransactionId,
            productId: item.productId,
            purchaseToken: item.purchaseToken,
            raw: item.rawPurchase,
            store: item.store,
            transactionDate: item.purchaseTime,
            transactionId: item.transactionId,
          },
        })
        await options.queue.markFinished(item.id)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to finish transaction'
        await options.queue.markFailed(item.id, message)
        options.logger?.warn('SubKit failed to finish transaction after verification', { error, itemId: item.id })
      }
    }

    return result
  }

  return { handlePurchaseEvent, syncPurchases }
}

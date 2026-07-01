import type { QueuedPurchase } from '@piparotech/subkit-core'

import type { SubKitIapPurchase } from './types.js'

export type QueueStatus = 'pending' | 'verifying' | 'verified' | 'finish_failed' | 'finished' | 'failed'

export interface PurchaseQueueItem extends QueuedPurchase {
  status: QueueStatus
}

export interface PurchaseQueueStore {
  enqueue(purchase: SubKitIapPurchase, appUserId?: string): Promise<PurchaseQueueItem>
  listPending(appUserId?: string): Promise<PurchaseQueueItem[]>
  markFailed(id: string, error: string): Promise<void>
  markFinished(id: string): Promise<void>
  markVerified(id: string): Promise<void>
}

export function createPurchaseQueueId(purchase: SubKitIapPurchase): string {
  if (purchase.transactionId != null && purchase.transactionId !== '') return `${purchase.store}:tx:${purchase.transactionId}`
  if (purchase.originalTransactionId != null && purchase.originalTransactionId !== '') return `${purchase.store}:original:${purchase.originalTransactionId}`
  if (purchase.purchaseToken != null && purchase.purchaseToken !== '') return `${purchase.store}:token:${purchase.purchaseToken}`
  return `${purchase.store}:fallback:${purchase.productId}:${purchase.transactionDate ?? 'unknown'}`
}

export function createMemoryPurchaseQueueStore(now: () => number = () => Date.now()): PurchaseQueueStore {
  const items = new Map<string, PurchaseQueueItem>()

  return {
    async enqueue(purchase, appUserId) {
      const id = createPurchaseQueueId(purchase)
      const existing = items.get(id)
      const timestamp = now()
      const next: PurchaseQueueItem = {
        anonymousId: undefined,
        attempts: existing == null ? 0 : existing.attempts,
        createdAt: existing?.createdAt ?? timestamp,
        id,
        lastError: existing?.lastError,
        originalTransactionId: purchase.originalTransactionId,
        platform: purchase.store === 'apple_app_store' ? 'ios' : 'android',
        productId: purchase.productId,
        purchaseTime: purchase.transactionDate,
        purchaseToken: purchase.purchaseToken,
        rawPurchase: purchase.raw,
        receipt: undefined,
        status: existing?.status === 'finished' ? 'finished' : 'pending',
        store: purchase.store,
        transactionId: purchase.transactionId,
        updatedAt: timestamp,
        userId: resolvePurchaseQueueUserId(existing, appUserId),
      }
      items.set(id, next)
      return next
    },
    async listPending(appUserId) {
      const normalizedAppUserId = normalizeQueueAppUserId(appUserId)
      return [...items.values()].filter((item) => item.status !== 'finished' && purchaseQueueItemMatchesAppUser(item, normalizedAppUserId))
    },
    async markFailed(id, error) {
      const item = items.get(id)
      if (item == null) return
      items.set(id, { ...item, attempts: item.attempts + 1, lastError: error, status: 'failed', updatedAt: now() })
    },
    async markFinished(id) {
      const item = items.get(id)
      if (item == null) return
      items.set(id, { ...item, status: 'finished', updatedAt: now() })
    },
    async markVerified(id) {
      const item = items.get(id)
      if (item == null) return
      items.set(id, { ...item, status: 'verified', updatedAt: now() })
    },
  }
}

export function resolvePurchaseQueueUserId(existing: PurchaseQueueItem | undefined, appUserId: string | undefined): string | undefined {
  const existingUserId = normalizeQueueAppUserId(existing?.userId)
  if (existingUserId != null) return existingUserId
  return normalizeQueueAppUserId(appUserId)
}

export function purchaseQueueItemMatchesAppUser(item: PurchaseQueueItem, appUserId: string | undefined): boolean {
  const normalizedAppUserId = normalizeQueueAppUserId(appUserId)
  if (normalizedAppUserId == null) return true
  return normalizeQueueAppUserId(item.userId) === normalizedAppUserId
}

function normalizeQueueAppUserId(appUserId: string | undefined): string | undefined {
  if (appUserId == null) return undefined
  const trimmed = appUserId.trim()
  return trimmed === '' ? undefined : trimmed
}

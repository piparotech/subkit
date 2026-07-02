import { createPurchaseQueueId, type QueuedPurchase } from '@piparotech/subkit-core'

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
  markRejected(id: string, error: string): Promise<void>
  markVerified(id: string): Promise<void>
}

const MAX_QUEUE_ATTEMPTS = 3

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
        environment: purchase.environment,
        id,
        lastError: existing?.lastError,
        linkedPurchaseToken: purchase.linkedPurchaseToken,
        orderId: purchase.orderId,
        originalTransactionId: purchase.originalTransactionId,
        ownershipType: purchase.ownershipType,
        platform: purchase.store === 'apple_app_store' ? 'ios' : 'android',
        productId: purchase.productId,
        purchaseTime: purchase.transactionDate,
        purchaseToken: purchase.purchaseToken,
        quantity: purchase.quantity,
        rawPurchase: purchase.raw,
        receipt: purchase.receipt,
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
      return [...items.values()].filter((item) => isDrainedQueueStatus(item) && purchaseQueueItemMatchesAppUser(item, normalizedAppUserId))
    },
    async markFailed(id, error) {
      const item = items.get(id)
      if (item == null) return
      const attempts = item.attempts + 1
      items.set(id, { ...item, attempts, lastError: error, status: attempts >= MAX_QUEUE_ATTEMPTS ? 'failed' : 'finish_failed', updatedAt: now() })
    },
    async markFinished(id) {
      const item = items.get(id)
      if (item == null) return
      items.set(id, stripSensitiveFinishedFields({ ...item, status: 'finished', updatedAt: now() }))
    },
    async markRejected(id, error) {
      const item = items.get(id)
      if (item == null) return
      items.set(id, stripSensitiveFinishedFields({ ...item, attempts: item.attempts + 1, lastError: error, status: 'failed', updatedAt: now() }))
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
  const itemUserId = normalizeQueueAppUserId(item.userId)
  return itemUserId == null || itemUserId === normalizedAppUserId
}

function normalizeQueueAppUserId(appUserId: string | undefined): string | undefined {
  if (appUserId == null) return undefined
  const trimmed = appUserId.trim()
  return trimmed === '' ? undefined : trimmed
}

function isDrainedQueueStatus(item: PurchaseQueueItem): boolean {
  return item.status !== 'finished' && item.status !== 'failed' && item.attempts < MAX_QUEUE_ATTEMPTS
}

function stripSensitiveFinishedFields(item: PurchaseQueueItem): PurchaseQueueItem {
  return {
    ...item,
    purchaseToken: undefined,
    rawPurchase: undefined,
    receipt: undefined,
  }
}

export { createPurchaseQueueId }

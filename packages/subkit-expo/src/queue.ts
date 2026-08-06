import { type QueuedPurchase, createPurchaseQueueId } from '@piparotech/subkit-core'

import type { SubKitIapPurchase } from './types.js'

export type QueueStatus = 'pending' | 'verified' | 'finish_failed' | 'finished' | 'failed'

export interface PurchaseQueueItem extends QueuedPurchase {
  status: QueueStatus
}

export interface PurchaseQueueBinding {
  appUserId?: string
  identityGeneration: number
  installationId: string
}

export interface PurchaseQueueStore {
  enqueue(purchase: SubKitIapPurchase, binding: PurchaseQueueBinding): Promise<PurchaseQueueItem>
  enqueueMany(
    purchases: readonly SubKitIapPurchase[],
    binding: PurchaseQueueBinding,
  ): Promise<PurchaseQueueItem[]>
  /** Persist the durable reconcile id once a 202 is received (crash-safe resume), or clear it (null) when the job is no longer pollable (404). */
  attachReconcileId(id: string, reconcileId: string | null): Promise<void>
  listPending(binding: PurchaseQueueBinding): Promise<PurchaseQueueItem[]>
  markFailed(id: string, error: string): Promise<void>
  markFinished(id: string): Promise<void>
  markRejected(id: string, error: string): Promise<void>
  markVerified(id: string): Promise<void>
}

const MAX_QUEUE_ATTEMPTS = 3

export function buildPurchaseQueueItem(
  purchase: SubKitIapPurchase,
  existing: PurchaseQueueItem | undefined,
  binding: PurchaseQueueBinding,
  timestamp: number,
): PurchaseQueueItem {
  return {
    anonymousId: undefined,
    attempts: existing?.status === 'failed' ? 0 : (existing?.attempts ?? 0),
    createdAt: existing?.createdAt ?? timestamp,
    environment: purchase.environment,
    id: createPurchaseQueueId(purchase),
    identityGeneration: existing?.identityGeneration ?? binding.identityGeneration,
    installationId: existing?.installationId ?? binding.installationId,
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
    reconcileId: existing?.reconcileId,
    status: existing?.status === 'finished' ? 'finished' : 'pending',
    store: purchase.store,
    transactionId: purchase.transactionId,
    updatedAt: timestamp,
    userId: resolvePurchaseQueueUserId(existing, binding.appUserId),
  }
}

export function createMemoryPurchaseQueueStore(
  now: () => number = () => Date.now(),
): PurchaseQueueStore {
  const items = new Map<string, PurchaseQueueItem>()

  function upsert(
    purchase: SubKitIapPurchase,
    binding: PurchaseQueueBinding,
    timestamp: number,
  ): PurchaseQueueItem {
    const id = createPurchaseQueueId(purchase)
    const next = buildPurchaseQueueItem(purchase, items.get(id), binding, timestamp)
    items.set(id, next)
    return next
  }

  return {
    async enqueue(purchase, binding) {
      return upsert(purchase, binding, now())
    },
    async enqueueMany(purchases, binding) {
      const timestamp = now()
      return purchases.map((purchase) => upsert(purchase, binding, timestamp))
    },
    async listPending(binding) {
      const normalizedAppUserId = normalizeQueueAppUserId(binding.appUserId)
      return [...items.values()].filter(
        (item) =>
          isDrainedQueueStatus(item) &&
          purchaseQueueItemMatchesBinding(item, { ...binding, appUserId: normalizedAppUserId }),
      )
    },
    async markFailed(id, error) {
      const item = items.get(id)
      if (item == null) return
      const attempts = item.attempts + 1
      items.set(id, {
        ...item,
        attempts,
        lastError: error,
        status: attempts >= MAX_QUEUE_ATTEMPTS ? 'failed' : 'finish_failed',
        updatedAt: now(),
      })
    },
    async markFinished(id) {
      const item = items.get(id)
      if (item == null) return
      items.set(id, stripSensitiveFinishedFields({ ...item, status: 'finished', updatedAt: now() }))
    },
    async markRejected(id, error) {
      const item = items.get(id)
      if (item == null) return
      items.set(
        id,
        stripSensitiveFinishedFields({
          ...item,
          attempts: item.attempts + 1,
          lastError: error,
          status: 'failed',
          updatedAt: now(),
        }),
      )
    },
    async markVerified(id) {
      const item = items.get(id)
      if (item == null) return
      items.set(id, { ...item, status: 'verified', updatedAt: now() })
    },
    async attachReconcileId(id, reconcileId) {
      const item = items.get(id)
      if (item == null) return
      items.set(id, { ...item, reconcileId, updatedAt: now() })
    },
  }
}

export function resolvePurchaseQueueUserId(
  existing: PurchaseQueueItem | undefined,
  appUserId: string | undefined,
): string | undefined {
  const existingUserId = normalizeQueueAppUserId(existing?.userId)
  if (existingUserId != null) return existingUserId
  return normalizeQueueAppUserId(appUserId)
}

export function purchaseQueueItemMatchesBinding(
  item: PurchaseQueueItem,
  binding: PurchaseQueueBinding,
): boolean {
  const normalizedAppUserId = normalizeQueueAppUserId(binding.appUserId)
  const itemUserId = normalizeQueueAppUserId(item.userId)
  return (
    itemUserId === normalizedAppUserId &&
    item.identityGeneration === binding.identityGeneration &&
    item.installationId === binding.installationId
  )
}

export function purchaseQueueItemMatchesAppUser(
  item: PurchaseQueueItem,
  appUserId: string | undefined,
): boolean {
  const itemUserId = normalizeQueueAppUserId(item.userId)
  return itemUserId === normalizeQueueAppUserId(appUserId)
}

function normalizeQueueAppUserId(appUserId: string | undefined): string | undefined {
  if (appUserId == null) return undefined
  const trimmed = appUserId.trim()
  return trimmed === '' ? undefined : trimmed
}

function isDrainedQueueStatus(item: PurchaseQueueItem): boolean {
  return (
    item.status !== 'finished' && item.status !== 'failed' && item.attempts < MAX_QUEUE_ATTEMPTS
  )
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

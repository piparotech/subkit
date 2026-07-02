import type { SubKitIapPurchase } from './types.js'
import { createPurchaseQueueId, purchaseQueueItemMatchesAppUser, resolvePurchaseQueueUserId, type PurchaseQueueItem, type PurchaseQueueStore, type QueueStatus } from './queue.js'

export interface SubKitJsonStorage {
  getItem(key: string): Promise<string | null>
  removeItem(key: string): Promise<void>
  setItem(key: string, value: string): Promise<void>
}

export interface SubKitMmkvLikeStorage {
  delete(key: string): void
  getString(key: string): string | undefined
  set(key: string, value: string): void
}

export function createMmkvJsonStorage(storage: SubKitMmkvLikeStorage): SubKitJsonStorage {
  return {
    async getItem(key) {
      return storage.getString(key) ?? null
    },
    async removeItem(key) {
      storage.delete(key)
    },
    async setItem(key, value) {
      storage.set(key, value)
    },
  }
}

export interface StoredPurchaseQueueOptions {
  key?: string
  maxItems?: number
  now?: () => number
  storage: SubKitJsonStorage
}

const MAX_QUEUE_ATTEMPTS = 3

export function createStoredPurchaseQueueStore(options: StoredPurchaseQueueOptions): PurchaseQueueStore {
  const key = options.key ?? 'subkit:iap:purchase-queue:v1'
  const maxItems = options.maxItems ?? 100
  const now = options.now ?? (() => Date.now())

  return {
    async enqueue(purchase, appUserId) {
      const items = await readItems(options.storage, key)
      const id = createPurchaseQueueId(purchase)
      const existing = items.find((item) => item.id === id)
      const timestamp = now()
      const next: PurchaseQueueItem = {
        anonymousId: undefined,
        attempts: existing?.attempts ?? 0,
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
      await writeItems(options.storage, key, keepNewestUnfinished(upsertItem(items, next), maxItems))
      return next
    },
    async listPending(appUserId) {
      const items = await readItems(options.storage, key)
      return items.filter((item) => isDrainedQueueStatus(item) && purchaseQueueItemMatchesAppUser(item, appUserId))
    },
    async markFailed(id, error) {
      await updateItem(options.storage, key, id, (item) => {
        const attempts = item.attempts + 1
        return {
          ...item,
          attempts,
          lastError: error,
          status: attempts >= MAX_QUEUE_ATTEMPTS ? 'failed' : 'finish_failed',
          updatedAt: now(),
        }
      })
    },
    async markFinished(id) {
      await updateItem(options.storage, key, id, (item) => stripSensitiveFinishedFields({ ...item, status: 'finished', updatedAt: now() }))
    },
    async markRejected(id, error) {
      await updateItem(options.storage, key, id, (item) => stripSensitiveFinishedFields({ ...item, attempts: item.attempts + 1, lastError: error, status: 'failed', updatedAt: now() }))
    },
    async markVerified(id) {
      await updateItem(options.storage, key, id, (item) => ({ ...item, status: 'verified', updatedAt: now() }))
    },
  }
}

async function readItems(storage: SubKitJsonStorage, key: string): Promise<PurchaseQueueItem[]> {
  const raw = await storage.getItem(key)
  if (raw == null || raw.trim() === '') return []

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const items: PurchaseQueueItem[] = []
    for (const item of parsed) {
      const parsedItem = parsePurchaseQueueItem(item)
      if (parsedItem != null) items.push(parsedItem)
    }
    return items
  } catch {
    await storage.setItem(`${key}:corrupt`, raw)
    await storage.removeItem(key)
    return []
  }
}

async function writeItems(storage: SubKitJsonStorage, key: string, items: readonly PurchaseQueueItem[]): Promise<void> {
  if (items.length === 0) {
    await storage.removeItem(key)
    return
  }
  await storage.setItem(key, JSON.stringify(items))
}

async function updateItem(storage: SubKitJsonStorage, key: string, id: string, update: (item: PurchaseQueueItem) => PurchaseQueueItem): Promise<void> {
  const items = await readItems(storage, key)
  await writeItems(storage, key, items.map((item) => (item.id === id ? update(item) : item)))
}

function upsertItem(items: readonly PurchaseQueueItem[], next: PurchaseQueueItem): PurchaseQueueItem[] {
  const withoutNext = items.filter((item) => item.id !== next.id)
  return [...withoutNext, next]
}

function keepNewestUnfinished(items: readonly PurchaseQueueItem[], maxItems: number): PurchaseQueueItem[] {
  if (items.length <= maxItems) return [...items]
  const unfinished = items.filter((item) => item.status !== 'finished')
  const finished = items.filter((item) => item.status === 'finished')
  return [...finished, ...unfinished].slice(-maxItems)
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

function parsePurchaseQueueItem(value: unknown): PurchaseQueueItem | null {
  if (!isRecord(value)) return null

  const status = readQueueStatus(value, 'status')
  const store = readString(value, 'store')
  const platform = readString(value, 'platform')
  const attempts = readNumber(value, 'attempts') ?? 0
  const createdAt = readNumber(value, 'createdAt')
  const updatedAt = readNumber(value, 'updatedAt') ?? createdAt

  if (status == null || store == null || platform == null || createdAt == null) return null
  if (store !== 'apple_app_store' && store !== 'google_play') return null
  if (platform !== 'ios' && platform !== 'android') return null

  const id = readString(value, 'id')
  const productId = readString(value, 'productId')
  if (id == null || productId == null) return null

  return {
    anonymousId: readString(value, 'anonymousId'),
    attempts: Number.isFinite(attempts) ? attempts : 0,
    createdAt,
    environment: readStoreEnvironment(value, 'environment'),
    id,
    lastError: readString(value, 'lastError'),
    linkedPurchaseToken: readString(value, 'linkedPurchaseToken'),
    orderId: readString(value, 'orderId'),
    originalTransactionId: readString(value, 'originalTransactionId'),
    ownershipType: readOwnershipType(value, 'ownershipType'),
    platform,
    productId,
    purchaseTime: readNumber(value, 'purchaseTime'),
    purchaseToken: readString(value, 'purchaseToken'),
    quantity: readNumber(value, 'quantity'),
    rawPurchase: value.rawPurchase,
    receipt: readString(value, 'receipt'),
    status,
    store,
    transactionId: readString(value, 'transactionId'),
    updatedAt: updatedAt ?? createdAt,
    userId: readString(value, 'userId'),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readString(value: Record<string, unknown>, key: string): string | undefined {
  const field = value[key]
  return typeof field === 'string' && field.trim() !== '' ? field : undefined
}

function readNumber(value: Record<string, unknown>, key: string): number | undefined {
  const field = value[key]
  return typeof field === 'number' && Number.isFinite(field) ? field : undefined
}

function readQueueStatus(value: Record<string, unknown>, key: string): QueueStatus | undefined {
  const field = readString(value, key)
  if (field === 'pending' || field === 'verifying' || field === 'verified' || field === 'finish_failed' || field === 'finished' || field === 'failed') return field
  return undefined
}

function readStoreEnvironment(value: Record<string, unknown>, key: string): PurchaseQueueItem['environment'] {
  const field = readString(value, key)
  if (field === 'sandbox' || field === 'production' || field === 'unknown') return field
  return undefined
}

function readOwnershipType(value: Record<string, unknown>, key: string): PurchaseQueueItem['ownershipType'] {
  const field = readString(value, key)
  if (field === 'purchased' || field === 'family_shared' || field === 'unknown') return field
  return undefined
}

export type { SubKitIapPurchase }

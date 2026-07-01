import type { SubKitIapPurchase } from './types'
import { createPurchaseQueueId, type PurchaseQueueItem, type PurchaseQueueStore } from './queue'

export interface SubKitJsonStorage {
  getItem(key: string): Promise<string | null>
  removeItem(key: string): Promise<void>
  setItem(key: string, value: string): Promise<void>
}

export interface StoredPurchaseQueueOptions {
  key?: string
  maxItems?: number
  now?: () => number
  storage: SubKitJsonStorage
}

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
        userId: appUserId,
      }
      await writeItems(options.storage, key, upsertItem(items, next).slice(-maxItems))
      return next
    },
    async listPending() {
      const items = await readItems(options.storage, key)
      return items.filter((item) => item.status !== 'finished')
    },
    async markFailed(id, error) {
      await updateItem(options.storage, key, id, (item) => ({
        ...item,
        attempts: item.attempts + 1,
        lastError: error,
        status: 'failed',
        updatedAt: now(),
      }))
    },
    async markFinished(id) {
      await updateItem(options.storage, key, id, (item) => ({ ...item, status: 'finished', updatedAt: now() }))
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
    return parsed.filter(isPurchaseQueueItem)
  } catch {
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

function isPurchaseQueueItem(value: unknown): value is PurchaseQueueItem {
  if (typeof value !== 'object' || value === null) return false
  return hasString(value, 'id') && hasString(value, 'productId') && hasString(value, 'store') && hasString(value, 'status') && hasNumber(value, 'createdAt')
}

function hasString(value: object, key: string): boolean {
  return key in value && typeof value[key as keyof typeof value] === 'string'
}

function hasNumber(value: object, key: string): boolean {
  return key in value && typeof value[key as keyof typeof value] === 'number'
}

export type { SubKitIapPurchase }

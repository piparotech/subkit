import type { StoreName } from './types.js'

export interface PurchaseQueueIdentifierInput {
  orderId?: string
  originalTransactionId?: string
  productId?: string
  purchaseTime?: number
  purchaseToken?: string
  store: StoreName
  storeProductId?: string
  transactionDate?: number
  transactionId?: string
}

export function createPurchaseQueueId(purchase: PurchaseQueueIdentifierInput): string {
  const transactionId = normalizeIdentifierPart(purchase.transactionId)
  if (transactionId != null) return `${purchase.store}:tx:${transactionId}`

  const originalTransactionId = normalizeIdentifierPart(purchase.originalTransactionId)
  if (originalTransactionId != null) return `${purchase.store}:original:${originalTransactionId}`

  const purchaseToken = normalizeIdentifierPart(purchase.purchaseToken)
  if (purchaseToken != null) return `${purchase.store}:token:${purchaseToken}`

  const orderId = normalizeIdentifierPart(purchase.orderId)
  if (orderId != null) return `${purchase.store}:order:${orderId}`

  const productId = normalizeIdentifierPart(purchase.productId ?? purchase.storeProductId) ?? 'unknown'
  const purchaseTime = purchase.purchaseTime ?? purchase.transactionDate ?? 'unknown'
  return `${purchase.store}:fallback:${productId}:${purchaseTime}`
}

function normalizeIdentifierPart(value: string | undefined): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

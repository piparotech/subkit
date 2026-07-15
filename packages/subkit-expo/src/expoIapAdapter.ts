import {
  type Product,
  type ProductOrSubscription,
  type ProductSubscription,
  type Purchase,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
} from 'expo-iap'

import type {
  SubKitExpoIapAdapter,
  SubKitIapAdapterBundle,
  SubKitPurchaseListenerAdapter,
  SubKitPurchaseListenerSubscription,
} from './adapter.js'
import type {
  SubKitIapProduct,
  SubKitIapProductType,
  SubKitIapPurchase,
  SubKitIapSubscriptionOffer,
  SubKitPurchaseRequest,
} from './types.js'

export function createExpoIapAdapter(): SubKitIapAdapterBundle {
  const iap: SubKitExpoIapAdapter = {
    async endConnection() {
      await endConnection()
    },
    async fetchProducts(input) {
      const products = await fetchProducts({ skus: input.skus, type: input.type })
      return normalizeProducts(products ?? [], input.type)
    },
    async finishTransaction(input) {
      if (!isExpoPurchase(input.purchase.raw)) {
        throw new Error('Cannot finish transaction without original expo-iap purchase payload')
      }
      await finishTransaction({ isConsumable: input.isConsumable, purchase: input.purchase.raw })
    },
    async getAvailablePurchases() {
      const purchases = await getAvailablePurchases({
        alsoPublishToEventListenerIOS: false,
        includeSuspendedAndroid: true,
        onlyIncludeActiveItemsIOS: true,
      })
      return purchases.map(normalizePurchase)
    },
    async initConnection() {
      return initConnection()
    },
    async requestPurchase(input) {
      const purchases = await requestPurchase(toExpoPurchaseRequest(input))
      if (purchases == null) return []
      return (Array.isArray(purchases) ? purchases : [purchases]).map(normalizePurchase)
    },
    async restorePurchases() {
      await restorePurchases()
    },
  }

  const listeners: SubKitPurchaseListenerAdapter = {
    addPurchaseErrorListener(listener) {
      return purchaseErrorListener((error: unknown) => {
        listener(error)
      })
    },
    addPurchaseUpdatedListener(listener) {
      return purchaseUpdatedListener((purchase: Purchase) => {
        listener(normalizePurchase(purchase))
      })
    },
  }

  return { iap, listeners }
}

export async function endExpoIapConnection(): Promise<void> {
  await endConnection()
}

function toExpoPurchaseRequest(
  input: SubKitPurchaseRequest,
): Parameters<typeof requestPurchase>[0] {
  if (input.productType === 'subs') {
    return {
      request: {
        apple: {
          appAccountToken: input.appAccountToken,
          sku: input.productId,
        },
        google: {
          obfuscatedAccountId: input.obfuscatedAccountId,
          obfuscatedProfileId: input.obfuscatedProfileId,
          skus: [input.productId],
          subscriptionOffers:
            input.offerToken == null
              ? undefined
              : [{ offerToken: input.offerToken, sku: input.productId }],
        },
      },
      type: 'subs',
    }
  }

  return {
    request: {
      apple: {
        appAccountToken: input.appAccountToken,
        sku: input.productId,
      },
      google: {
        obfuscatedAccountId: input.obfuscatedAccountId,
        obfuscatedProfileId: input.obfuscatedProfileId,
        offerToken: input.offerToken,
        skus: [input.productId],
      },
    },
    type: 'in-app',
  }
}

function normalizeProducts(
  products: readonly ProductOrSubscription[],
  fallbackType: SubKitIapProductType,
): SubKitIapProduct[] {
  return products.map((product) => normalizeProduct(product, fallbackType))
}

function normalizeProduct(
  product: Product | ProductSubscription,
  fallbackType: SubKitIapProductType,
): SubKitIapProduct {
  return {
    currency: product.currency,
    description: product.description,
    displayPrice: product.displayPrice,
    id: product.id,
    price: product.price ?? undefined,
    raw: product,
    subscriptionOffers: normalizeSubscriptionOffers(product),
    title: product.title,
    type: product.type === 'subs' ? 'subs' : fallbackType,
  }
}

function normalizeSubscriptionOffers(
  product: Product | ProductSubscription,
): SubKitIapSubscriptionOffer[] | undefined {
  if (product.type !== 'subs' || product.platform !== 'android') return undefined
  return product.subscriptionOffers.map((offer) => ({
    basePlanId: offer.basePlanIdAndroid ?? undefined,
    currency: offer.currency ?? undefined,
    displayPrice: offer.displayPrice,
    id: offer.id,
    offerToken: offer.offerTokenAndroid ?? undefined,
    price: offer.price,
  }))
}

function normalizePurchase(purchase: Purchase): SubKitIapPurchase {
  return {
    environment:
      readStringProperty(purchase, 'environmentIOS') === 'production'
        ? 'production'
        : readStringProperty(purchase, 'environmentIOS') === 'sandbox'
          ? 'sandbox'
          : 'unknown',
    originalTransactionId:
      readStringProperty(purchase, 'originalTransactionIdentifierIOS') ?? undefined,
    ownershipType:
      readStringProperty(purchase, 'ownershipTypeIOS') === 'FAMILY_SHARED'
        ? 'family_shared'
        : 'purchased',
    productId: purchase.productId,
    purchaseToken: purchase.purchaseToken ?? undefined,
    quantity: purchase.quantity,
    raw: purchase,
    receipt: purchase.purchaseToken ?? undefined,
    store: purchase.store === 'google' ? 'google_play' : 'apple_app_store',
    transactionDate: purchase.transactionDate,
    transactionId: purchase.transactionId ?? undefined,
  }
}

function isExpoPurchase(value: unknown): value is Purchase {
  return typeof value === 'object' && value !== null && 'productId' in value && 'store' in value
}

function readStringProperty(value: unknown, key: string): string | null {
  if (!isRecord(value)) return null
  const recordValue = value[key]
  return typeof recordValue === 'string' ? recordValue : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export type { SubKitPurchaseListenerSubscription }

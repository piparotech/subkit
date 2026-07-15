import type {
  Offering,
  OfferingPackage,
  PurchaseSyncReason,
  RuntimeOfferingsResponse,
  StoreIdentityHints,
} from '@piparotech/subkit-core'

export type SubKitIapProductType = 'in-app' | 'subs'
export type SubKitIapPlatform = 'ios' | 'android'
export type SubKitIapStore = 'apple_app_store' | 'google_play'

export interface SubKitIapProduct {
  currency?: string
  description?: string
  displayPrice?: string
  id: string
  price?: number
  raw: unknown
  subscriptionOffers?: SubKitIapSubscriptionOffer[]
  title?: string
  type: SubKitIapProductType
}

export interface SubKitIapSubscriptionOffer {
  basePlanId?: string
  currency?: string
  displayPrice?: string
  id: string
  offerToken?: string
  price?: number
}

export interface SubKitStoreProduct {
  currency?: string
  displayPrice: string
  price?: number
  title?: string
}

export interface SubKitOfferingPackage extends OfferingPackage {
  storeProduct: SubKitStoreProduct | null
}

export interface SubKitOffering extends Omit<Offering, 'packages'> {
  packages: SubKitOfferingPackage[]
}

export interface SubKitOfferingsResponse extends Omit<RuntimeOfferingsResponse, 'all' | 'current'> {
  all: SubKitOffering[]
  current: SubKitOffering | null
}

export interface SubKitIapPurchase {
  environment?: 'sandbox' | 'production' | 'unknown'
  linkedPurchaseToken?: string
  orderId?: string
  originalTransactionId?: string
  ownershipType?: 'purchased' | 'family_shared' | 'unknown'
  productId: string
  purchaseToken?: string
  quantity?: number
  raw: unknown
  receipt?: string
  store: SubKitIapStore
  transactionDate?: number
  transactionId?: string
}

export interface SubKitPurchaseRequest {
  appAccountToken?: string
  isConsumable?: boolean
  obfuscatedAccountId?: string
  obfuscatedProfileId?: string
  offerToken?: string
  productId: string
  productType: SubKitIapProductType
}

export interface SubKitSyncOptions {
  force?: boolean
  reason: PurchaseSyncReason
}

export interface SubKitExpoIapConfig {
  apiBaseUrl?: string
  appUserId?: string
  iap?: {
    autoSync?: boolean
    customerInfoStaleAfterMs?: number
    foregroundMinIntervalMs?: number
    nonExpiringEntitlementMaxOfflineAgeMs?: number
    sessionResumeThresholdMs?: number
    syncOnAppStart?: boolean
    syncOnForeground?: boolean
    syncOnPurchaseEvent?: boolean
  }
  sdkKey: string
}

export interface SubKitIdentityState {
  appUserId?: string
  storeIdentityHints?: StoreIdentityHints
}

export type StorePlatform = 'ios' | 'android'
export type StoreName = 'apple_app_store' | 'google_play'
export type StoreEnvironment = 'sandbox' | 'production' | 'unknown'
export type ProductKind = 'subscription' | 'non_consumable' | 'consumable'
export type EntitlementStatus = 'active' | 'trialing' | 'billing_retry' | 'grace_period' | 'paused' | 'expired' | 'refunded' | 'revoked' | 'pending'
export type CustomerInfoFreshness = 'fresh' | 'stale' | 'syncing' | 'offline' | 'error'
export type PurchaseSyncReason = 'app_start' | 'foreground' | 'identity_changed' | 'purchase_event' | 'manual_restore' | 'paywall_preflight' | 'queue_retry'
export type PurchaseResultStatus = 'cancelled' | 'pending' | 'verified' | 'failed'
export type VerificationStatus = 'verified' | 'accepted_unverified' | 'pending' | 'failed'
export type OwnershipConflictResolution = 'login_original_account' | 'manual_review' | 'support_required'

export interface StoreIdentityHints {
  apple?: {
    appAccountToken: string
  }
  google?: {
    obfuscatedAccountId: string
    obfuscatedProfileId?: string
  }
}

export interface CustomerEntitlement {
  active: boolean
  entitlementKey: string
  expiresAt: string | null
  productIdentifier: string | null
  source: 'apple' | 'google' | 'voucher' | 'promo' | 'manual' | 'lifetime' | 'migration' | 'family_shared'
  startsAt: string | null
  status: EntitlementStatus
  verifiedAt: string | null
}

export interface CustomerPurchase {
  canClaim: boolean
  conflict: boolean
  expiresAt: string | null
  ownership: 'current' | 'alias' | 'previous' | 'unowned' | 'conflict'
  status: EntitlementStatus
  store: StoreName
  storeProductId: string
}

export interface CustomerUnclaimedPurchase {
  claimHint: 'restore_required' | 'login_required' | 'support_required'
  expiresAt: string | null
  status: EntitlementStatus
  store: StoreName
  storeProductId: string
}

export interface CustomerInfo {
  appId: string
  appUserId: string
  checkedAt: string
  entitlements: Record<string, CustomerEntitlement>
  freshness: CustomerInfoFreshness
  purchases: CustomerPurchase[]
  storeIdentityHints?: StoreIdentityHints
  unclaimedPurchases: CustomerUnclaimedPurchase[]
}

export interface StoreProduct {
  billingPeriod: string | null
  description: string
  displayName: string
  entitlementKeys: string[]
  kind: ProductKind
  planKey: string
  priceCents: number
  productKey: string
  storeProductIds: {
    apple?: string
    google?: string
  }
  trialEnabled: boolean
}

export interface OfferingPackage {
  badge: string | null
  identifier: string
  label: string
  product: StoreProduct
}

export interface Offering {
  description: string
  identifier: string
  metadata: Record<string, string>
  name: string
  packages: OfferingPackage[]
}

export interface RuntimeOfferingsResponse {
  all: Offering[]
  appId: string
  current: Offering | null
}

export interface NormalizedStorePurchase {
  environment?: StoreEnvironment
  linkedPurchaseToken?: string
  orderId?: string
  originalTransactionId?: string
  ownershipType?: 'purchased' | 'family_shared' | 'unknown'
  productId?: string
  purchaseTime?: number
  purchaseToken?: string
  quantity?: number
  rawPayload?: unknown
  receipt?: string
  store: StoreName
  storeProductId: string
  transactionId?: string
}

export interface FinishableTransaction {
  isConsumable: boolean
  purchaseId: string
  store: StoreName
  transactionId: string | null
}

export interface PurchaseOwnershipConflict {
  reason: 'owned_by_another_user' | 'ambiguous_owner' | 'family_shared_not_claimable'
  resolution: OwnershipConflictResolution
  store: StoreName
  storeProductId: string
  transactionId: string | null
}

export interface RejectedPurchase {
  code: 'missing_identity' | 'product_not_found' | 'validation_failed' | 'invalid_purchase' | 'ownership_conflict'
  message: string
  store: StoreName
  storeProductId: string
  transactionId: string | null
}

export interface PurchaseSyncResult {
  acceptedPurchases: string[]
  checkedAt: string
  conflicts: PurchaseOwnershipConflict[]
  customerInfo: CustomerInfo
  finishableTransactions: FinishableTransaction[]
  rejectedPurchases: RejectedPurchase[]
  verificationStatus: VerificationStatus
}

export type PurchaseResult =
  | { status: 'cancelled' }
  | { purchaseId: string; status: 'pending' }
  | { customerInfo: CustomerInfo; status: 'verified' }
  | { error: SubKitSerializableError; status: 'failed' }

export interface SubKitSerializableError {
  code: string
  message: string
  metadata?: Record<string, string | number | boolean | null>
  retryable: boolean
}

export interface QueuedPurchase {
  anonymousId?: string
  attempts: number
  createdAt: number
  environment?: StoreEnvironment
  id: string
  lastError?: string
  linkedPurchaseToken?: string
  orderId?: string
  originalTransactionId?: string
  ownershipType?: 'purchased' | 'family_shared' | 'unknown'
  platform: StorePlatform
  productId: string
  purchaseTime?: number
  purchaseToken?: string
  quantity?: number
  receipt?: string
  rawPurchase?: unknown
  store: StoreName
  transactionId?: string
  updatedAt: number
  userId?: string
}

export interface RuntimeCustomerInfoRequest {
  appUserId: string
}

export interface RuntimeCustomerInfoWithAppRequest extends RuntimeCustomerInfoRequest {
  appId: string
}

export interface RuntimeOfferingsRequest {
  appUserId?: string
  placement?: string
  platform?: StorePlatform
}

export interface RuntimeOfferingsWithAppRequest extends RuntimeOfferingsRequest {
  appId: string
}

export interface IapReconcileRequest {
  appUserId?: string
  installationId: string
  platform: StorePlatform
  purchases: NormalizedStorePurchase[]
  reason: PurchaseSyncReason
  sessionId: string
  storeIdentities?: StoreIdentityHints
}

export interface IapReconcileWithAppRequest extends IapReconcileRequest {
  appId: string
}

export interface RuntimeEntitlementCheckRequest {
  appUserId: string
  entitlement: string
}

export interface RuntimeEntitlementCheckWithAppRequest extends RuntimeEntitlementCheckRequest {
  appId: string
}

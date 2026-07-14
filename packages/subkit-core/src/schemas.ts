import { z } from 'zod'

export const storePlatformSchema = z.enum(['ios', 'android'])
export const storeNameSchema = z.enum(['apple_app_store', 'google_play'])
export const storeEnvironmentSchema = z.enum(['sandbox', 'production', 'unknown'])
export const productKindSchema = z.enum(['subscription', 'non_consumable', 'consumable'])
export const entitlementStatusSchema = z.enum([
  'active',
  'trialing',
  'billing_retry',
  'grace_period',
  'paused',
  'expired',
  'refunded',
  'revoked',
  'pending',
])
export const customerInfoFreshnessSchema = z.enum(['fresh', 'stale', 'syncing', 'offline', 'error'])
export const purchaseSyncReasonSchema = z.enum([
  'app_start',
  'foreground',
  'identity_changed',
  'purchase_event',
  'manual_restore',
  'paywall_preflight',
  'queue_retry',
])
export const verificationStatusSchema = z.enum(['verified', 'failed'])

export const storeIdentityHintsSchema = z.strictObject({
  apple: z
    .strictObject({
      appAccountToken: z.uuid(),
    })
    .optional(),
  google: z
    .strictObject({
      obfuscatedAccountId: z.string().min(1),
      obfuscatedProfileId: z.string().min(1).optional(),
    })
    .optional(),
})

export const customerEntitlementSchema = z.strictObject({
  active: z.boolean(),
  entitlementKey: z.string().min(1),
  expiresAt: z.string().nullable(),
  planKey: z.string().nullable(),
  productIdentifier: z.string().nullable(),
  source: z.enum([
    'apple',
    'google',
    'voucher',
    'promo',
    'manual',
    'lifetime',
    'migration',
    'family_shared',
  ]),
  startsAt: z.string().nullable(),
  status: entitlementStatusSchema,
  verifiedAt: z.string().nullable(),
})

export const customerPurchaseSchema = z.strictObject({
  canClaim: z.boolean(),
  conflict: z.boolean(),
  expiresAt: z.string().nullable(),
  ownership: z.enum(['current', 'alias', 'previous', 'unowned', 'conflict']),
  status: entitlementStatusSchema,
  store: storeNameSchema,
  storeProductId: z.string().min(1),
})

export const customerUnclaimedPurchaseSchema = z.strictObject({
  claimHint: z.enum(['restore_required', 'login_required', 'support_required']),
  expiresAt: z.string().nullable(),
  status: entitlementStatusSchema,
  store: storeNameSchema,
  storeProductId: z.string().min(1),
})

export const customerInfoSchema = z.strictObject({
  appId: z.string().min(1),
  appUserId: z.string().min(1),
  checkedAt: z.string().min(1),
  entitlements: z.record(z.string(), customerEntitlementSchema),
  freshness: customerInfoFreshnessSchema,
  purchases: z.array(customerPurchaseSchema),
  storeIdentityHints: storeIdentityHintsSchema.optional(),
  unclaimedPurchases: z.array(customerUnclaimedPurchaseSchema),
})

const runtimePlanEntitlementSchema = z.strictObject({
  durationIso: z.string().nullable(),
  grantMode: z.enum(['while_source_active', 'lifetime', 'fixed_duration']),
  key: z.string().min(1),
})

const runtimePlanOfferSchema = z.strictObject({
  billingPeriodCount: z.number().int().positive().nullable(),
  durationIso: z.string().nullable(),
  eligibility: z.enum(['new_customers', 'lapsed', 'existing', 'all', 'store_managed']),
  key: z.string().min(1),
  offerType: z.enum(['free_trial', 'intro_price', 'promo', 'winback', 'custom_code']),
  priceAmountMicros: z.number().int().nonnegative().nullable(),
  priceCurrencyCode: z.string().length(3).nullable(),
})

const runtimePlanPoolSchema = z.strictObject({
  capacity: z.number().int().positive().nullable(),
  capacityChangePolicy: z.enum(['immediate', 'renewal_only', 'forbidden']),
  entitlementKeys: z.array(z.string().min(1)),
  key: z.string().min(1),
  reservationMode: z.enum(['disabled', 'optional', 'required']),
  reservationTtlIso: z.string().nullable(),
})

const runtimePlanPriceSchema = z.strictObject({
  amountMicros: z.number().int().nonnegative(),
  countryCode: z.string().length(2).nullable(),
  currencyCode: z.string().length(3),
  salesChannel: z.enum([
    'apple',
    'google',
    'direct_checkout',
    'assisted_contract',
    'free_enrollment',
    'operator_provision',
  ]),
  taxInclusive: z.boolean().nullable(),
})

export const storeProductSchema = z.strictObject({
  description: z.string(),
  displayName: z.string(),
  kind: productKindSchema,
  plan: z.strictObject({
    billingKind: z.enum(['recurring', 'one_time', 'external', 'none']),
    billingPeriodIso: z.string().nullable(),
    fixedTermIso: z.string().nullable(),
    gracePeriodIso: z.string().nullable(),
    id: z.string().min(1),
    key: z.string().min(1),
    version: z.number().int().positive(),
    versionId: z.string().min(1),
  }),
  entitlements: z.array(runtimePlanEntitlementSchema),
  offers: z.array(runtimePlanOfferSchema),
  pools: z.array(runtimePlanPoolSchema),
  prices: z.array(runtimePlanPriceSchema),
  productId: z.string().min(1),
  productKey: z.string().min(1),
  storeProductIds: z.strictObject({
    apple: z
      .strictObject({
        offerIds: z.array(z.string().min(1)),
        productId: z.string().min(1),
        subscriptionGroupId: z.string().min(1).optional(),
      })
      .optional(),
    google: z
      .strictObject({
        basePlanId: z.string().min(1).nullable(),
        productId: z.string().min(1),
      })
      .optional(),
  }),
  trial: z
    .strictObject({
      durationIso: z.string().nullable(),
      eligibility: z.enum(['new_customers', 'lapsed', 'existing', 'all', 'store_managed']),
    })
    .nullable(),
})

export const offeringPackageSchema = z.strictObject({
  badge: z.string().nullable(),
  identifier: z.string().min(1),
  label: z.string().min(1),
  product: storeProductSchema,
})

export const offeringSchema = z.strictObject({
  description: z.string(),
  identifier: z.string().min(1),
  metadata: z.record(z.string(), z.string()),
  name: z.string().min(1),
  packages: z.array(offeringPackageSchema),
})

export const runtimeOfferingsResponseSchema = z.strictObject({
  all: z.array(offeringSchema),
  appId: z.string().min(1),
  current: offeringSchema.nullable(),
})

export const normalizedStorePurchaseSchema = z.strictObject({
  environment: storeEnvironmentSchema.optional(),
  linkedPurchaseToken: z.string().min(1).optional(),
  orderId: z.string().min(1).optional(),
  originalTransactionId: z.string().min(1).optional(),
  ownershipType: z.enum(['purchased', 'family_shared', 'unknown']).optional(),
  productId: z.string().min(1).optional(),
  purchaseTime: z.number().int().optional(),
  purchaseToken: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  rawPayload: z.unknown().optional(),
  receipt: z.string().min(1).optional(),
  store: storeNameSchema,
  storeProductId: z.string().min(1),
  transactionId: z.string().min(1).optional(),
})

export const finishableTransactionSchema = z.strictObject({
  isConsumable: z.boolean(),
  purchaseId: z.string().min(1),
  store: storeNameSchema,
  transactionId: z.string().nullable(),
})

export const purchaseOwnershipConflictSchema = z.strictObject({
  reason: z.enum(['owned_by_another_user', 'ambiguous_owner', 'family_shared_not_claimable']),
  resolution: z.enum(['login_original_account', 'manual_review', 'support_required']),
  store: storeNameSchema,
  storeProductId: z.string().min(1),
  transactionId: z.string().nullable(),
})

export const rejectedPurchaseSchema = z.strictObject({
  code: z.enum([
    'missing_identity',
    'product_not_found',
    'validation_failed',
    'invalid_purchase',
    'ownership_conflict',
  ]),
  message: z.string().min(1),
  store: storeNameSchema,
  storeProductId: z.string().min(1),
  transactionId: z.string().nullable(),
})

export const iapReconcileResponseSchema = z.strictObject({
  acceptedPurchases: z.array(z.string().min(1)),
  checkedAt: z.string().min(1),
  conflicts: z.array(purchaseOwnershipConflictSchema),
  customerInfo: customerInfoSchema,
  finishableTransactions: z.array(finishableTransactionSchema),
  rejectedPurchases: z.array(rejectedPurchaseSchema),
  verificationStatus: verificationStatusSchema,
})

const runtimeEnvironmentSchema = z.enum(['production', 'sandbox'])

export const runtimeCustomerInfoRequestSchema = z.object({
  appUserId: z.string().min(1),
  environment: runtimeEnvironmentSchema.optional(),
})

export const runtimeCustomerInfoWithAppRequestSchema = runtimeCustomerInfoRequestSchema.extend({
  appId: z.string().min(1),
})

export const runtimeOfferingsRequestSchema = z.object({
  appUserId: z.string().min(1).optional(),
  environment: runtimeEnvironmentSchema.optional(),
  placement: z.string().min(1).optional(),
  platform: storePlatformSchema.optional(),
})

export const runtimeOfferingsWithAppRequestSchema = runtimeOfferingsRequestSchema.extend({
  appId: z.string().min(1),
})

export const iapReconcileRequestSchema = z.object({
  appUserId: z.string().min(1).optional(),
  environment: runtimeEnvironmentSchema.optional(),
  installationId: z.string().min(1),
  platform: storePlatformSchema,
  purchases: z.array(normalizedStorePurchaseSchema),
  reason: purchaseSyncReasonSchema,
  sessionId: z.string().min(1),
  storeIdentities: storeIdentityHintsSchema.optional(),
})

export const iapReconcileWithAppRequestSchema = iapReconcileRequestSchema.extend({
  appId: z.string().min(1),
})

export const runtimeEntitlementCheckRequestSchema = z.object({
  appUserId: z.string().min(1),
  entitlement: z.string().min(1),
  environment: runtimeEnvironmentSchema.optional(),
})

export const runtimeEntitlementCheckWithAppRequestSchema =
  runtimeEntitlementCheckRequestSchema.extend({
    appId: z.string().min(1),
  })

export type RuntimeCustomerInfoRequestInput = z.infer<typeof runtimeCustomerInfoRequestSchema>
export type RuntimeCustomerInfoWithAppRequestInput = z.infer<
  typeof runtimeCustomerInfoWithAppRequestSchema
>
export type RuntimeOfferingsRequestInput = z.infer<typeof runtimeOfferingsRequestSchema>
export type RuntimeOfferingsWithAppRequestInput = z.infer<
  typeof runtimeOfferingsWithAppRequestSchema
>
export type IapReconcileRequestInput = z.infer<typeof iapReconcileRequestSchema>
export type IapReconcileWithAppRequestInput = z.infer<typeof iapReconcileWithAppRequestSchema>
export type RuntimeEntitlementCheckRequestInput = z.infer<
  typeof runtimeEntitlementCheckRequestSchema
>
export type RuntimeEntitlementCheckWithAppRequestInput = z.infer<
  typeof runtimeEntitlementCheckWithAppRequestSchema
>

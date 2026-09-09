import { z } from 'zod'
import { serverGrantContextSchema } from './server-grant-context.js'

export const serverGrantStatusSchema = z.enum(['active', 'suspended', 'expired', 'revoked'])
export type ServerGrantStatus = z.infer<typeof serverGrantStatusSchema>

export const serverEntitlementCheckReasonSchema = z.enum([
  'allowed',
  'app_not_found',
  'app_user_not_found',
  'entitlement_not_found',
  'no_active_grant',
])
export type ServerEntitlementCheckReason = z.infer<typeof serverEntitlementCheckReasonSchema>

export const serverEntitlementCheckRequestSchema = z.object({
  accessContext: z.string().min(1).optional(),
  appId: z.string().min(1),
  appUserId: z.string().min(1),
  entitlement: z.string().min(1),
  environment: z.enum(['sandbox', 'production']).optional(),
})
export type ServerEntitlementCheckRequest = z.infer<typeof serverEntitlementCheckRequestSchema>

export const serverGrantSchema = z.object({
  effective: z.boolean(),
  context: serverGrantContextSchema,
  accessSourceId: z.string().min(1),
  allocationId: z.string().nullable(),
  store: z.enum(['apple_app_store', 'google_play']).nullable(),
  storeProductId: z.string().nullable(),
  entitlement: z.string().min(1),
  expiresAt: z.string().nullable(),
  id: z.string().min(1),
  productIdentifier: z.string().nullable(),
  source: z.string().min(1),
  startsAt: z.string().min(1),
  status: serverGrantStatusSchema,
})
export type ServerGrant = z.infer<typeof serverGrantSchema>

export const serverEntitlementCheckResponseSchema = z.object({
  allowed: z.boolean(),
  appId: z.string().min(1),
  appUserId: z.string().min(1),
  checkedAt: z.string().min(1),
  entitlement: z.string().min(1),
  grants: z.array(serverGrantSchema),
  reason: serverEntitlementCheckReasonSchema,
  status: z.union([serverGrantStatusSchema, z.literal('not_found')]),
})
export type ServerEntitlementCheckResponse = z.infer<typeof serverEntitlementCheckResponseSchema>

export const serverCustomerEntitlementSchema = z.object({
  entitlement: z.string().min(1),
  expiresAt: z.string().nullable(),
  productIdentifier: z.string().nullable(),
  source: z.string().min(1).nullable(),
  startsAt: z.string().nullable(),
  status: z.union([serverGrantStatusSchema, z.literal('not_found')]),
})
export type ServerCustomerEntitlement = z.infer<typeof serverCustomerEntitlementSchema>

export const serverCustomerInfoRequestSchema = z.object({
  accessContext: z.string().min(1).optional(),
  appId: z.string().min(1),
  appUserId: z.string().min(1),
  environment: z.enum(['sandbox', 'production']).optional(),
})
export type ServerCustomerInfoRequest = z.infer<typeof serverCustomerInfoRequestSchema>

export const serverCustomerInfoResponseSchema = z.object({
  appId: z.string().min(1),
  appUserId: z.string().min(1),
  checkedAt: z.string().min(1),
  entitlements: z.record(z.string().min(1), serverCustomerEntitlementSchema),
})
export type ServerCustomerInfoResponse = z.infer<typeof serverCustomerInfoResponseSchema>

export const serverOfferingsRequestSchema = z.object({
  appId: z.string().min(1),
  appUserId: z.string().min(1).optional(),
  environment: z.enum(['sandbox', 'production']).optional(),
  placement: z.string().min(1).optional(),
  platform: z.enum(['ios', 'android']).optional(),
})
export type ServerOfferingsRequest = z.infer<typeof serverOfferingsRequestSchema>

export const serverProductsRequestSchema = z.object({
  appId: z.string().min(1),
  entitlement: z.string().min(1).optional(),
})
export type ServerProductsRequest = z.infer<typeof serverProductsRequestSchema>

export const serverCreateSdkKeyRequestSchema = z.object({
  appId: z.string().min(1),
  reason: z.string().trim().min(1),
})
export type ServerCreateSdkKeyRequest = z.infer<typeof serverCreateSdkKeyRequestSchema>

export const serverCreateSdkKeyResponseSchema = z.object({
  appId: z.string().min(1),
  key: z.string().min(1),
})
export type ServerCreateSdkKeyResponse = z.infer<typeof serverCreateSdkKeyResponseSchema>

const serverStoreProductIdsSchema = z.object({
  apple: z.string().min(1).optional(),
  google: z.string().min(1).optional(),
})

export const serverProductSchema = z.object({
  billingPeriod: z.string().nullable(),
  displayName: z.string().min(1),
  entitlementKeys: z.array(z.string().min(1)),
  id: z.string().min(1),
  planId: z.string().min(1),
  planKey: z.string().min(1),
  planVersion: z.number().int().positive(),
  planVersionId: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  productKey: z.string().min(1),
  storeProductIds: serverStoreProductIdsSchema,
})
export type ServerProduct = z.infer<typeof serverProductSchema>

export const serverProductsResponseSchema = z.object({
  products: z.array(serverProductSchema),
})
export type ServerProductsResponse = z.infer<typeof serverProductsResponseSchema>

/**
 * Human operator behind a trusted Server API key call. A backend such as the
 * SmartCoach CMS authenticates its own human admin (ZITADEL) and forwards that
 * identity so SubKit audit evidence distinguishes the technical key from the
 * person, and correlates the CMS action with the canonical mutation.
 */
export const serverOperatorContextSchema = z.object({
  correlationId: z.string().trim().min(1).max(200).optional(),
  displayName: z.string().trim().min(1).max(200).optional(),
  userId: z.string().trim().min(1).max(200),
})
export type ServerOperatorContext = z.infer<typeof serverOperatorContextSchema>

export const serverLicenseKindSchema = z.enum([
  'store_subscription',
  'store_purchase',
  'direct_subscription',
  'contract',
  'trial',
  'promotion',
  'free_enrollment',
  'manual',
  'migration',
])
export type ServerLicenseKind = z.infer<typeof serverLicenseKindSchema>

export const serverLicenseListRequestSchema = z.object({
  appId: z.string().min(1),
  cursor: z.string().min(1).nullable().optional(),
  kind: z.enum(['individual', 'club']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  query: z.string().trim().min(1).max(200).optional(),
  state: z.enum(['pending', 'active', 'suspended', 'expired', 'revoked']).optional(),
})
export type ServerLicenseListRequest = z.infer<typeof serverLicenseListRequestSchema>

export const serverLicenseSummarySchema = z.object({
  billingAccountName: z.string().nullable(),
  capacityAvailable: z.number().nullable(),
  capacityTotal: z.number().nullable(),
  capacityUsed: z.number(),
  category: z.enum(['individual', 'club']),
  createdAt: z.string(),
  kind: serverLicenseKindSchema,
  licenseeName: z.string(),
  planVersionLabel: z.string(),
  productName: z.string(),
  sourceId: z.string(),
  state: z.enum(['pending', 'active', 'suspended', 'expired', 'revoked', 'rejected']),
  updatedAt: z.string(),
  validUntil: z.string().nullable(),
  verificationState: z.enum(['pending', 'verified', 'failed']),
})
export type ServerLicenseSummary = z.infer<typeof serverLicenseSummarySchema>

export const serverLicenseListResponseSchema = z.object({
  activeCount: z.number(),
  expiringSoonCount: z.number(),
  licenses: z.array(serverLicenseSummarySchema),
  nextCursor: z.string().nullable(),
  openReservationCount: z.number(),
  totalCount: z.number(),
})
export type ServerLicenseListResponse = z.infer<typeof serverLicenseListResponseSchema>

export const serverLicenseDetailRequestSchema = z.object({
  appId: z.string().min(1),
  sourceId: z.string().min(1),
})
export type ServerLicenseDetailRequest = z.infer<typeof serverLicenseDetailRequestSchema>

const serverLicensePoolSchema = z.object({
  available: z.string(),
  capacity: z.string(),
  id: z.string(),
  key: z.string(),
  reserved: z.number(),
  state: z.string(),
  used: z.number(),
})

const serverLicenseReservationSchema = z.object({
  expiresAt: z.string().nullable(),
  id: z.string(),
  poolKey: z.string(),
  quantity: z.number(),
  state: z.string(),
  subject: z.string().nullable(),
})

const serverLicenseAllocationSchema = z.object({
  availableActions: z.array(z.enum(['suspend', 'resume', 'revoke'])),
  id: z.string(),
  poolKey: z.string(),
  quantity: z.number(),
  state: z.string(),
  subject: z.string(),
  validUntil: z.string().nullable(),
})

const serverLicenseGrantSchema = z.object({
  allocationId: z.string(),
  entitlement: z.string(),
  id: z.string(),
  poolKey: z.string(),
  state: z.string(),
  subject: z.string(),
  validUntil: z.string().nullable(),
})

const serverLicensePaymentSchema = z.object({
  amount: z.string(),
  currencyCode: z.string(),
  id: z.string(),
  kind: z.string(),
  occurredAt: z.string(),
  provider: z.string(),
  state: z.string(),
})

export const serverLicenseDetailResponseSchema = z.object({
  allocations: z.array(serverLicenseAllocationSchema),
  billingAccountId: z.string().nullable(),
  billingAccountName: z.string().nullable(),
  canManageContract: z.boolean(),
  contractNumber: z.string().nullable(),
  externalReference: z.string(),
  grants: z.array(serverLicenseGrantSchema),
  kind: serverLicenseKindSchema,
  payments: z.array(serverLicensePaymentSchema),
  planVersionId: z.string().nullable(),
  planVersionLabel: z.string(),
  pools: z.array(serverLicensePoolSchema),
  productName: z.string(),
  reservations: z.array(serverLicenseReservationSchema),
  sourceId: z.string(),
  state: z.enum(['pending', 'active', 'suspended', 'expired', 'revoked', 'rejected']),
  termEnd: z.string().nullable(),
  termStart: z.string().nullable(),
  validUntil: z.string().nullable(),
  verificationState: z.enum(['pending', 'verified', 'failed']),
})
export type ServerLicenseDetailResponse = z.infer<typeof serverLicenseDetailResponseSchema>

export const serverContractPlanVersionsRequestSchema = z.object({
  appId: z.string().min(1),
})
export type ServerContractPlanVersionsRequest = z.infer<
  typeof serverContractPlanVersionsRequestSchema
>

export const serverContractPlanVersionSchema = z.object({
  billingLabel: z.string(),
  entitlementKeys: z.array(z.string()),
  planKey: z.string(),
  planVersion: z.number().int().positive(),
  planVersionId: z.string(),
  poolCapacityLabel: z.string(),
  priceLabel: z.string().nullable(),
  productKey: z.string(),
  productName: z.string(),
})
export type ServerContractPlanVersion = z.infer<typeof serverContractPlanVersionSchema>

export const serverContractPlanVersionsResponseSchema = z.object({
  planVersions: z.array(serverContractPlanVersionSchema),
})
export type ServerContractPlanVersionsResponse = z.infer<
  typeof serverContractPlanVersionsResponseSchema
>

/**
 * A server-configured key for selecting a safe return route. This is never a
 * URL or path supplied by the caller; the service resolves it through its
 * allowlist for the app.
 */
export const serverDirectBillingReturnTargetSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9_-]*$/)
export type ServerDirectBillingReturnTarget = z.infer<typeof serverDirectBillingReturnTargetSchema>

/**
 * Provider lifecycle states are exposed as a normalized read-only view. The
 * service maps provider events to these canonical values at its integration
 * boundary; callers must not treat them as commands or provider API inputs.
 */
export const serverDirectBillingStatusSchema = z.enum([
  'none',
  'pending',
  'trialing',
  'active',
  'past_due',
  'paused',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
])
export type ServerDirectBillingStatus = z.infer<typeof serverDirectBillingStatusSchema>

const serverDirectBillingHttpsUrlSchema = z.url({ protocol: /^https$/ })
const serverDirectCheckoutIntentIdSchema = z.string().regex(/^checkout-intent:[A-Za-z0-9_-]+$/)
const serverDirectPortalIntentIdSchema = z.string().regex(/^billing-portal:[A-Za-z0-9_-]+$/)
const serverDirectBillingCurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/)

/**
 * Canonical direct-billing read model. It deliberately contains catalog and
 * billing terms only; provider identifiers, payment-method details, and
 * client secrets are not part of the public contract.
 */
export const serverDirectBillingSummarySchema = z.strictObject({
  environment: z.enum(['sandbox', 'production']),
  amountMicros: z.number().int().nonnegative().nullable(),
  billingPeriodIso: z.iso.duration().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  currencyCode: serverDirectBillingCurrencyCodeSchema.nullable(),
  currentPeriodEnd: z.iso.datetime().nullable(),
  currentPeriodStart: z.iso.datetime().nullable(),
  nextBillingAt: z.iso.datetime().nullable(),
  offeringIdentifier: z.string().min(1).nullable(),
  packageIdentifier: z.string().min(1).nullable(),
  planKey: z.string().min(1).nullable(),
  planLabel: z.string().min(1).nullable(),
  status: serverDirectBillingStatusSchema,
})
export type ServerDirectBillingSummary = z.infer<typeof serverDirectBillingSummarySchema>

/**
 * Create a hosted checkout session from an already-published Offering and
 * package. The service resolves the Individual Billing Account from the
 * authenticated active app-user Subject, then resolves price, currency,
 * provider Product/Price IDs, payment methods, and redirect URLs from app
 * configuration.
 */
export const serverDirectCheckoutSessionRequestSchema = z.strictObject({
  appId: z.string().min(1),
  offeringIdentifier: z.string().min(1),
  packageIdentifier: z.string().min(1),
  reason: z.string().trim().min(1),
  returnTarget: serverDirectBillingReturnTargetSchema.optional(),
  subjectId: z.string().min(1),
})
export type ServerDirectCheckoutSessionRequest = z.infer<
  typeof serverDirectCheckoutSessionRequestSchema
>

/**
 * The checkout redirect and identifier are intentionally opaque and
 * short-lived. They are SubKit-owned intent IDs, not Stripe Checkout Session
 * IDs or client secrets.
 */
export const serverDirectCheckoutSessionResponseSchema = z.strictObject({
  checkoutIntentId: serverDirectCheckoutIntentIdSchema,
  redirectUrl: serverDirectBillingHttpsUrlSchema,
  redirectUrlExpiresAt: z.iso.datetime(),
})
export type ServerDirectCheckoutSessionResponse = z.infer<
  typeof serverDirectCheckoutSessionResponseSchema
>

export const serverBillingPortalSessionRequestSchema = z.strictObject({
  appId: z.string().min(1),
  reason: z.string().trim().min(1),
  returnTarget: serverDirectBillingReturnTargetSchema.optional(),
  subjectId: z.string().min(1),
})
export type ServerBillingPortalSessionRequest = z.infer<
  typeof serverBillingPortalSessionRequestSchema
>

/** The portal intent ID and redirect are opaque service-owned values. */
export const serverBillingPortalSessionResponseSchema = z.strictObject({
  portalIntentId: serverDirectPortalIntentIdSchema,
  redirectUrl: serverDirectBillingHttpsUrlSchema,
  redirectUrlExpiresAt: z.iso.datetime(),
})
export type ServerBillingPortalSessionResponse = z.infer<
  typeof serverBillingPortalSessionResponseSchema
>

export const serverDirectCheckoutStatusRequestSchema = z.strictObject({
  appId: z.string().min(1),
  subjectId: z.string().min(1),
  checkoutIntentId: serverDirectCheckoutIntentIdSchema,
  entitlement: z.string().min(1),
})
export type ServerDirectCheckoutStatusRequest = z.infer<
  typeof serverDirectCheckoutStatusRequestSchema
>

export const serverDirectCheckoutStatusResponseSchema = z
  .strictObject({
    checkoutIntentId: serverDirectCheckoutIntentIdSchema,
    environment: z.enum(['sandbox', 'production']),
    status: z.enum(['created', 'pending', 'completed', 'canceled', 'expired', 'failed']),
    accessReady: z.boolean(),
    expiresAt: z.iso.datetime(),
    completedAt: z.iso.datetime().nullable(),
    source: z
      .strictObject({
        state: z.enum(['pending', 'active', 'suspended', 'expired', 'revoked', 'rejected']),
        verificationState: z.enum(['pending', 'verified', 'failed']),
        validFrom: z.iso.datetime(),
        validUntil: z.iso.datetime().nullable(),
      })
      .nullable(),
  })
  .refine(
    (value) =>
      !value.accessReady ||
      (value.status === 'completed' &&
        value.completedAt !== null &&
        value.source?.state === 'active' &&
        value.source.verificationState === 'verified'),
    { message: 'Ready purchase requires completed checkout and verified active source' },
  )
export type ServerDirectCheckoutStatusResponse = z.infer<
  typeof serverDirectCheckoutStatusResponseSchema
>

export const serverDirectBillingSummaryRequestSchema = z.strictObject({
  appId: z.string().min(1),
  subjectId: z.string().min(1),
})
export type ServerDirectBillingSummaryRequest = z.infer<
  typeof serverDirectBillingSummaryRequestSchema
>

export const serverDirectBillingSummaryResponseSchema = serverDirectBillingSummarySchema
export type ServerDirectBillingSummaryResponse = z.infer<
  typeof serverDirectBillingSummaryResponseSchema
>

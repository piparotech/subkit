import { z } from 'zod'

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

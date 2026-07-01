import { z } from 'zod'

export const serverGrantStatusSchema = z.enum(['active', 'trialing', 'billing_retry', 'expired', 'revoked'])
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
  appId: z.string().min(1),
  appUserId: z.string().min(1),
  entitlement: z.string().min(1),
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
  appId: z.string().min(1),
  appUserId: z.string().min(1),
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
  placement: z.string().min(1).optional(),
  platform: z.enum(['ios', 'android']).optional(),
})
export type ServerOfferingsRequest = z.infer<typeof serverOfferingsRequestSchema>

export const serverProductsRequestSchema = z.object({
  appId: z.string().min(1),
  entitlement: z.string().min(1).optional(),
})
export type ServerProductsRequest = z.infer<typeof serverProductsRequestSchema>

export const serverProductSchema = z.object({
  billingPeriod: z.string().nullable(),
  displayName: z.string().min(1),
  entitlementKeys: z.array(z.string().min(1)),
  id: z.string().min(1),
  planId: z.string().min(1),
  planKey: z.string().min(1),
  priceCents: z.number().int().nonnegative(),
  productKey: z.string().min(1),
})
export type ServerProduct = z.infer<typeof serverProductSchema>

export const serverOfferingPackageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  product: serverProductSchema,
  sortOrder: z.number().int(),
})
export type ServerOfferingPackage = z.infer<typeof serverOfferingPackageSchema>

export const serverOfferingSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  key: z.string().min(1),
  name: z.string().min(1),
  packages: z.array(serverOfferingPackageSchema),
})
export type ServerOffering = z.infer<typeof serverOfferingSchema>

export const serverOfferingsResponseSchema = z.object({
  offerings: z.array(serverOfferingSchema),
})
export type ServerOfferingsResponse = z.infer<typeof serverOfferingsResponseSchema>

export const serverProductsResponseSchema = z.object({
  products: z.array(serverProductSchema),
})
export type ServerProductsResponse = z.infer<typeof serverProductsResponseSchema>

import { z } from 'zod'

import {
  serverGuestCheckoutAssociationRequestSchema,
  serverGuestCheckoutAssociationResponseSchema,
  serverGuestCheckoutStatusRequestSchema,
} from './guest-checkout.js'

export const serverOrganizationPurchaseRequestSchema =
  serverGuestCheckoutStatusRequestSchema.extend({
    subjectId: z.string().trim().min(1),
  })

export const serverOrganizationAssociationRequestSchema =
  serverGuestCheckoutAssociationRequestSchema.extend({
    organizationName: z.string().trim().min(1).max(120),
  })

export const serverOrganizationAssociationResponseSchema =
  serverGuestCheckoutAssociationResponseSchema.extend({
    organizationSubjectId: z.string().min(1),
  })

export const organizationAccessPoolSchema = z.strictObject({
  poolId: z.string().min(1),
  accessSourceId: z.string().min(1),
  key: z.string().min(1),
  capacity: z.number().int().nonnegative().nullable(),
  used: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  entitlementKeys: z.array(z.string().min(1)),
})

export const serverOrganizationAccessResponseSchema = z
  .strictObject({
    appId: z.string().min(1),
    subjectId: z.string().min(1),
    purchaseReference: z.string().uuid(),
    checkoutIntentId: z.string().startsWith('checkout-intent:'),
    environment: z.enum(['sandbox', 'production']),
    organizationSubjectId: z.string().min(1),
    accessReady: z.boolean(),
    pools: z.array(organizationAccessPoolSchema),
  })
  .superRefine((value, context) => {
    if (!value.accessReady && value.pools.length > 0) {
      context.addIssue({
        code: 'custom',
        message: 'Pending access cannot expose available pools',
        path: ['pools'],
      })
    }
    if (new Set(value.pools.map((pool) => pool.key)).size !== value.pools.length) {
      context.addIssue({ code: 'custom', message: 'Duplicate access pool keys', path: ['pools'] })
    }
    if (new Set(value.pools.map((pool) => pool.poolId)).size !== value.pools.length) {
      context.addIssue({ code: 'custom', message: 'Duplicate access pool IDs', path: ['pools'] })
    }
    if (new Set(value.pools.map((pool) => pool.accessSourceId)).size > 1) {
      context.addIssue({
        code: 'custom',
        message: 'Purchase pools must share one access source',
        path: ['pools'],
      })
    }
    if (value.accessReady && value.pools.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Ready access requires provisioned pools',
        path: ['pools'],
      })
    }
  })

export type ServerOrganizationPurchaseRequest = z.infer<
  typeof serverOrganizationPurchaseRequestSchema
>
export type ServerOrganizationAssociationRequest = z.infer<
  typeof serverOrganizationAssociationRequestSchema
>
export type ServerOrganizationAssociationResponse = z.infer<
  typeof serverOrganizationAssociationResponseSchema
>
export type ServerOrganizationAccessResponse = z.infer<
  typeof serverOrganizationAccessResponseSchema
>

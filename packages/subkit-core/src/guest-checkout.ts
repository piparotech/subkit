import { z } from 'zod'

/** Trusted application server request; browser possession is verified by that server. */
export const serverGuestCheckoutSessionRequestSchema = z
  .object({
    appId: z.string().trim().min(1),
    purchaseReference: z.string().uuid(),
    offeringIdentifier: z.string().trim().min(1).max(200),
    packageIdentifier: z.string().trim().min(1).max(200),
    selectionRevision: z.string().regex(/^[a-f0-9]{64}$/),
    returnTarget: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-z][a-z0-9_-]*$/),
    reason: z.string().trim().min(1).max(500),
  })
  .strict()

export const serverGuestCheckoutStatusRequestSchema = z
  .object({
    appId: z.string().trim().min(1),
    purchaseReference: z.string().uuid(),
  })
  .strict()

/** subjectId must come from a verified app session, not checkout email or browser input. */
export const serverGuestCheckoutAssociationRequestSchema = serverGuestCheckoutStatusRequestSchema
  .extend({
    subjectId: z.string().trim().min(1),
    reason: z.string().trim().min(1).max(500),
  })
  .strict()

export const serverGuestCheckoutStatusResponseSchema = z
  .object({
    checkoutIntentId: z.string().startsWith('checkout-intent:'),
    environment: z.enum(['sandbox', 'production']),
    status: z.enum(['created', 'pending', 'completed', 'canceled', 'expired', 'failed']),
    expiresAt: z.string().datetime(),
    paymentVerified: z.boolean(),
  })
  .strict()
  .refine((value) => !value.paymentVerified || value.status === 'completed', {
    message: 'Verified payment requires completed checkout',
  })

export const serverGuestCheckoutAssociationResponseSchema = z
  .object({
    purchaseReference: z.string().uuid(),
    subjectId: z.string().min(1),
    status: z.literal('associated'),
  })
  .strict()

export type ServerGuestCheckoutStatusRequest = z.infer<
  typeof serverGuestCheckoutStatusRequestSchema
>
export type ServerGuestCheckoutStatusResponse = z.infer<
  typeof serverGuestCheckoutStatusResponseSchema
>
export type ServerGuestCheckoutAssociationRequest = z.infer<
  typeof serverGuestCheckoutAssociationRequestSchema
>
export type ServerGuestCheckoutAssociationResponse = z.infer<
  typeof serverGuestCheckoutAssociationResponseSchema
>
export type ServerGuestCheckoutSessionRequest = z.infer<
  typeof serverGuestCheckoutSessionRequestSchema
>

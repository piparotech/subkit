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
    /**
     * Language the hosted checkout should use, as a BCP 47 tag such as `de` or
     * `en-GB`. A service older than this field rejects it, so send it only to a
     * service that documents support. Unsupported languages fall back to the
     * browser language.
     */
    locale: z
      .string()
      .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,4})?$/)
      .optional(),
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

/**
 * Billing address exactly as Stripe collected it during Checkout. Every field is
 * optional there, so an absent value stays null instead of being invented.
 */
export const stripeCollectedAddressSchema = z
  .object({
    line1: z.string().nullable(),
    line2: z.string().nullable(),
    city: z.string().nullable(),
    postalCode: z.string().nullable(),
    state: z.string().nullable(),
    country: z.string().nullable(),
  })
  .strict()

export const serverGuestCheckoutStatusResponseSchema = z
  .object({
    checkoutIntentId: z.string().startsWith('checkout-intent:'),
    environment: z.enum(['sandbox', 'production']),
    status: z.enum(['created', 'pending', 'completed', 'canceled', 'expired', 'failed']),
    expiresAt: z.string().datetime(),
    paymentVerified: z.boolean(),
    /**
     * Payer identity Stripe collected. Both fields are optional on purpose: a
     * client built against this version must still parse a response from a
     * service that does not return them yet, so the contract change ships
     * before the service emits it.
     */
    payerAddress: stripeCollectedAddressSchema.nullable().optional(),
    payerEmail: z.string().nullable().optional(),
    /** Name the payer entered at checkout; a person or, for organizations, the organization. */
    payerName: z.string().nullable().optional(),
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

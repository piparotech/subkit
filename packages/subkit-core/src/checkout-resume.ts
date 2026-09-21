import { z } from 'zod'

/** Retrieve the original still-open hosted form without creating a session. */
export const serverDirectCheckoutResumeRequestSchema = z.strictObject({
  action: z.literal('resume'),
  appId: z.string().min(1),
  subjectId: z.string().min(1),
  checkoutIntentId: z.string().regex(/^checkout-intent:[A-Za-z0-9_-]+$/),
})

/** Application server verifies sealed browser ownership; Sandbox only. */
export const serverGuestCheckoutResumeRequestSchema = z.strictObject({
  action: z.literal('resume'),
  appId: z.string().min(1),
  purchaseReference: z.string().uuid(),
})

/** Expire the original unpaid Sandbox checkout before starting a replacement. */
export const serverGuestCheckoutExpireRequestSchema = z.strictObject({
  action: z.literal('expire'),
  appId: z.string().min(1),
  purchaseReference: z.string().uuid(),
})

/** Only expired authorizes a replacement; unavailable and completed never do. */
export const serverGuestCheckoutExpireResponseSchema = z.strictObject({
  checkoutIntentId: z.string().regex(/^checkout-intent:[A-Za-z0-9_-]+$/),
  state: z.enum(['expired', 'completed', 'unavailable']),
})

export type ServerGuestCheckoutExpireRequest = z.infer<
  typeof serverGuestCheckoutExpireRequestSchema
>
export type ServerGuestCheckoutExpireResponse = z.infer<
  typeof serverGuestCheckoutExpireResponseSchema
>

export type ServerGuestCheckoutResumeRequest = z.infer<
  typeof serverGuestCheckoutResumeRequestSchema
>

export type ServerDirectCheckoutResumeRequest = z.infer<
  typeof serverDirectCheckoutResumeRequestSchema
>

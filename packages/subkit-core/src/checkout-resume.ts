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

export type ServerGuestCheckoutResumeRequest = z.infer<typeof serverGuestCheckoutResumeRequestSchema>

export type ServerDirectCheckoutResumeRequest = z.infer<
  typeof serverDirectCheckoutResumeRequestSchema
>

import { z } from 'zod'

/** Retrieve the original still-open hosted form without creating a session. */
export const serverDirectCheckoutResumeRequestSchema = z.strictObject({
  action: z.literal('resume'),
  appId: z.string().min(1),
  subjectId: z.string().min(1),
  checkoutIntentId: z.string().regex(/^checkout-intent:[A-Za-z0-9_-]+$/),
})

export type ServerDirectCheckoutResumeRequest = z.infer<
  typeof serverDirectCheckoutResumeRequestSchema
>

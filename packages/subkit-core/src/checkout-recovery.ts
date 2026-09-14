import { z } from 'zod'

/** Alternative exact selector for the existing authenticated checkout-status read. */
export const serverDirectCheckoutRecoveryRequestSchema = z.strictObject({
  appId: z.string().min(1),
  subjectId: z.string().min(1),
  idempotencyKey: z.string().min(8).max(200),
  entitlement: z.string().min(1),
})

export type ServerDirectCheckoutRecoveryRequest = z.infer<
  typeof serverDirectCheckoutRecoveryRequestSchema
>

import { z } from 'zod'

export const serverGrantBillingSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('store'),
    state: z.enum(['normal', 'billing_retry', 'grace_period', 'on_hold', 'paused']),
    autoRenewEnabled: z.boolean().nullable(),
    periodEnd: z.string().nullable(),
    verifiedAt: z.string(),
  }),
  z.object({
    kind: z.literal('direct'),
    provider: z.enum(['stripe', 'external', 'manual']),
    state: z.enum([
      'pending',
      'trialing',
      'active',
      'past_due',
      'paused',
      'unpaid',
      'canceled',
      'incomplete',
      'incomplete_expired',
    ]),
    financialState: z.enum([
      'normal',
      'payment_failure',
      'refund_hold',
      'dispute_pending',
      'dispute_lost',
    ]),
    cancelAtPeriodEnd: z.boolean(),
    periodEnd: z.string().nullable(),
    verifiedAt: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('contract'),
    autoRenews: z.boolean(),
    termEnd: z.string().nullable(),
  }),
])
export type ServerGrantBilling = z.infer<typeof serverGrantBillingSchema>

export const serverGrantContextSchema = z.object({
  sourceState: z.enum(['pending', 'active', 'suspended', 'expired', 'revoked', 'rejected']),
  allocationState: z.enum(['pending', 'active', 'suspended', 'expired', 'revoked']),
  poolState: z.enum(['active', 'suspended', 'closed']),
  organizationSubjectId: z.string().nullable(),
  trialEnd: z.string().nullable(),
  billing: serverGrantBillingSchema.nullable(),
})
export type ServerGrantContext = z.infer<typeof serverGrantContextSchema>

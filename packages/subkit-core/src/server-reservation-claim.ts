import { z } from 'zod'

const identity = {
  appId: z.string().min(1),
  subjectId: z.string().min(1),
  reservationId: z.string().min(1),
  poolId: z.string().min(1),
  accessSourceId: z.string().min(1),
}

export const serverReservationClaimRequestSchema = z
  .object({
    ...identity,
    claimTokenHash: z.string().regex(/^[a-f0-9]{64}$/),
    reason: z.string().trim().min(1),
  })
  .strict()
export type ServerReservationClaimRequest = z.infer<typeof serverReservationClaimRequestSchema>

export const RESERVATION_CLAIM_REJECTIONS = [
  'changed',
  'expired',
  'used',
  'recipient_mismatch',
  'unavailable',
] as const

/** A durable claim result is not current effective access. */
export const serverReservationClaimResponseSchema = z.discriminatedUnion('status', [
  z.object({ ...identity, status: z.literal('claimed'), allocationId: z.string().min(1) }).strict(),
  z
    .object({
      ...identity,
      status: z.literal('rejected'),
      rejection: z.enum(RESERVATION_CLAIM_REJECTIONS),
    })
    .strict(),
])
export type ServerReservationClaimResponse = z.infer<typeof serverReservationClaimResponseSchema>

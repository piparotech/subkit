import { z } from 'zod'

export const serverReservationReadRequestSchema = z
  .object({
    appId: z.string().min(1),
    reservationId: z.string().min(1),
  })
  .strict()
export type ServerReservationReadRequest = z.infer<typeof serverReservationReadRequestSchema>

const reservationFields = {
  accessSourceId: z.string().min(1),
  appId: z.string().min(1),
  checkedAt: z.iso.datetime(),
  environment: z.enum(['sandbox', 'production']).nullable(),
  expiresAt: z.iso.datetime().nullable(),
  poolId: z.string().min(1),
  quantity: z.number().int().positive(),
  reservationId: z.string().min(1),
  subjectId: z.string().min(1).nullable(),
}

/** Trusted-server recovery evidence, not an entitlement or invitee authorization decision. */
export const serverReservationReadResponseSchema = z
  .discriminatedUnion('state', [
    z
      .object({
        ...reservationFields,
        state: z.enum(['pending', 'expired', 'revoked']),
        claim: z.null(),
      })
      .strict(),
    z
      .object({
        ...reservationFields,
        state: z.literal('claimed'),
        claim: z
          .object({
            allocationId: z.string().min(1),
            allocationState: z.enum(['pending', 'active', 'suspended', 'expired', 'revoked']),
            claimedAt: z.iso.datetime(),
            subjectId: z.string().min(1),
          })
          .strict(),
      })
      .strict(),
  ])
  .refine(
    (value) =>
      value.claim === null || value.subjectId === null || value.subjectId === value.claim.subjectId,
    { message: 'Reservation claim does not match its assigned subject' },
  )
export type ServerReservationReadResponse = z.infer<typeof serverReservationReadResponseSchema>

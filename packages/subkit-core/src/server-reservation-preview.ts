import { z } from 'zod'

import { serverReservationReadResponseSchema } from './server-reservations.js'

export const serverReservationPreviewRequestSchema = z
  .object({
    appId: z.string().min(1),
    claimTokenHash: z.string().regex(/^[a-f0-9]{64}$/),
    subjectId: z.string().min(1),
  })
  .strict()
export type ServerReservationPreviewRequest = z.infer<typeof serverReservationPreviewRequestSchema>

/** Private token-holder preview, not effective access or application membership authority. */
export const serverReservationPreviewResponseSchema = z
  .object({
    appId: z.string().min(1),
    subjectId: z.string().min(1),
    reservation: serverReservationReadResponseSchema,
    product: z
      .object({
        id: z.string().min(1),
        name: z.string().min(1),
        planVersionId: z.string().min(1),
      })
      .strict(),
    poolKey: z.string().min(1),
    entitlementKeys: z.array(z.string().min(1)),
  })
  .strict()
  .refine(
    (value) =>
      value.appId === value.reservation.appId &&
      (value.reservation.subjectId === null || value.reservation.subjectId === value.subjectId) &&
      (value.reservation.claim === null || value.reservation.claim.subjectId === value.subjectId),
    { message: 'Reservation preview does not match its app and recipient' },
  )
export type ServerReservationPreviewResponse = z.infer<
  typeof serverReservationPreviewResponseSchema
>

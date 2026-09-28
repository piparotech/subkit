import { z } from 'zod'

import {
  invitationCodeFormatSchema,
  invitationCodeInputSchema,
  invitationCodeMatchesFormat,
} from './invitation-code-format.js'
import { serverReservationPreviewResponseSchema } from './server-reservation-preview.js'

const identifier = z.string().trim().min(1).max(512)
const reason = z.string().trim().min(1).max(1000)
const recipientReference = z.string().trim().min(1).max(512)
const reservationIdentity = {
  appId: identifier,
  reservationId: identifier,
  poolId: identifier,
  accessSourceId: identifier,
}

/** Display-only recipient data, stored encrypted; it never authorizes a claim. */
export const invitationRecipientDisplaySchema = z
  .object({
    email: z.email().max(320).optional(),
    name: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .refine((value) => value.email !== undefined || value.name !== undefined, {
    message: 'Recipient display requires an email or name',
  })
export type InvitationRecipientDisplay = z.infer<typeof invitationRecipientDisplaySchema>

/** Terminal outcomes of a fully bound claim; wrong or unbound codes fail without a receipt. */
export const INVITATION_CLAIM_REJECTIONS = ['expired', 'used', 'unavailable'] as const
export type InvitationClaimRejection = (typeof INVITATION_CLAIM_REJECTIONS)[number]

export const invitationRecipientSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('subject'), subjectId: identifier }).strict(),
  z.object({ kind: z.literal('reference'), reference: recipientReference }).strict(),
])
export type InvitationRecipient = z.infer<typeof invitationRecipientSchema>

export const serverInvitationFormatReadRequestSchema = z.object({ appId: identifier }).strict()
export type ServerInvitationFormatReadRequest = z.infer<
  typeof serverInvitationFormatReadRequestSchema
>

export const serverInvitationFormatResponseSchema = z.union([
  z.object({ appId: identifier, revision: z.literal(0), format: z.null() }).strict(),
  z
    .object({
      appId: identifier,
      revision: z.number().int().positive(),
      format: invitationCodeFormatSchema,
    })
    .strict(),
])
export type ServerInvitationFormatResponse = z.infer<typeof serverInvitationFormatResponseSchema>

export const serverInvitationFormatUpdateRequestSchema = z
  .object({
    appId: identifier,
    expectedRevision: z.number().int().nonnegative(),
    format: invitationCodeFormatSchema,
    reason,
  })
  .strict()
export type ServerInvitationFormatUpdateRequest = z.infer<
  typeof serverInvitationFormatUpdateRequestSchema
>

export const serverInvitationIssueRequestSchema = z
  .object({
    appId: identifier,
    poolId: identifier,
    recipient: invitationRecipientSchema,
    recipientDisplay: invitationRecipientDisplaySchema.optional(),
    quantity: z.number().int().positive().default(1),
    expiresAt: z.iso.datetime().optional(),
    reason,
  })
  .strict()
export type ServerInvitationIssueRequest = z.infer<typeof serverInvitationIssueRequestSchema>
export type ServerInvitationIssueRequestInput = z.input<typeof serverInvitationIssueRequestSchema>

/** Only explicit, authorized delivery operations return the encrypted-at-rest credential. */
export const serverInvitationDeliveryResponseSchema = z
  .object({
    ...reservationIdentity,
    environment: z.enum(['sandbox', 'production']).nullable(),
    codeVersion: z.number().int().positive(),
    quantity: z.number().int().positive(),
    code: z.string().min(8).max(128),
    format: invitationCodeFormatSchema,
    formatRevision: z.number().int().positive(),
    expiresAt: z.iso.datetime(),
  })
  .strict()
  .refine((value) => invitationCodeMatchesFormat(value.code, value.format), {
    message: 'Invitation code does not match its issued format',
    path: ['code'],
  })
export type ServerInvitationDeliveryResponse = z.infer<
  typeof serverInvitationDeliveryResponseSchema
>

export const serverInvitationDeliveryRequestSchema = z
  .object({ ...reservationIdentity, expectedCodeVersion: z.number().int().positive(), reason })
  .strict()
export type ServerInvitationDeliveryRequest = z.infer<typeof serverInvitationDeliveryRequestSchema>

export const serverInvitationRotateRequestSchema = serverInvitationDeliveryRequestSchema
export type ServerInvitationRotateRequest = z.infer<typeof serverInvitationRotateRequestSchema>

/** The reference must come from the trusted backend's verified identity, never client input. */
export const serverInvitationPreviewRequestSchema = z
  .object({
    appId: identifier,
    subjectId: identifier,
    code: invitationCodeInputSchema,
    verifiedRecipientReference: recipientReference.optional(),
  })
  .strict()
export type ServerInvitationPreviewRequest = z.infer<typeof serverInvitationPreviewRequestSchema>

export const serverInvitationPreviewResponseSchema = serverReservationPreviewResponseSchema
  .safeExtend({
    codeVersion: z.number().int().positive(),
    /** Current licensee of the reservation's source; null when none is effective. */
    organizationSubjectId: identifier.nullable(),
  })
  .refine(
    ({ reservation }) =>
      reservation.state === 'pending' &&
      reservation.expiresAt !== null &&
      Date.parse(reservation.expiresAt) > Date.parse(reservation.checkedAt),
    { message: 'Invitation preview requires a pending reservation with finite future expiry' },
  )
export type ServerInvitationPreviewResponse = z.infer<typeof serverInvitationPreviewResponseSchema>

export const serverInvitationClaimRequestSchema = serverInvitationPreviewRequestSchema.extend({
  reservationId: identifier,
  poolId: identifier,
  accessSourceId: identifier,
  codeVersion: z.number().int().positive(),
  reason,
})
export type ServerInvitationClaimRequest = z.infer<typeof serverInvitationClaimRequestSchema>

const claimIdentity = {
  ...reservationIdentity,
  subjectId: identifier,
  codeVersion: z.number().int().positive(),
}

export const serverInvitationClaimResponseSchema = z.discriminatedUnion('status', [
  z.object({ ...claimIdentity, status: z.literal('claimed'), allocationId: identifier }).strict(),
  z
    .object({
      ...claimIdentity,
      status: z.literal('rejected'),
      rejection: z.enum(INVITATION_CLAIM_REJECTIONS),
    })
    .strict(),
])
export type ServerInvitationClaimResponse = z.infer<typeof serverInvitationClaimResponseSchema>

export const serverInvitationClaimStatusRequestSchema = serverInvitationClaimRequestSchema.extend({
  idempotencyKey: z.string().min(8).max(200),
})
export type ServerInvitationClaimStatusRequest = z.infer<
  typeof serverInvitationClaimStatusRequestSchema
>
export const serverInvitationClaimStatusResponseSchema = z.union([
  serverInvitationClaimResponseSchema,
  z.object({ ...claimIdentity, status: z.literal('pending') }).strict(),
])
export type ServerInvitationClaimStatusResponse = z.infer<
  typeof serverInvitationClaimStatusResponseSchema
>

const pageRequest = {
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).max(2048).optional(),
}

export const serverOrganizationInvitationListRequestSchema = z
  .object({ appId: identifier, organizationSubjectId: identifier, ...pageRequest })
  .strict()
export type ServerOrganizationInvitationListRequest = z.infer<
  typeof serverOrganizationInvitationListRequestSchema
>

/** One observed page of managed invitations; never contains a code. */
export const serverOrganizationInvitationListResponseSchema = z
  .object({
    appId: identifier,
    organizationSubjectId: identifier,
    environment: z.enum(['sandbox', 'production']).nullable(),
    checkedAt: z.iso.datetime(),
    items: z.array(
      z
        .object({
          reservationId: identifier,
          poolId: identifier,
          accessSourceId: identifier,
          state: z.enum(['pending', 'claimed', 'expired', 'revoked']),
          quantity: z.number().int().positive(),
          codeVersion: z.number().int().positive(),
          subjectId: identifier.nullable(),
          claimedBySubjectId: identifier.nullable(),
          /** Canonical allocation of a claimed invitation and its current state. */
          allocationId: identifier.nullable(),
          allocationState: z
            .enum(['pending', 'active', 'suspended', 'expired', 'revoked'])
            .nullable(),
          recipientDisplay: invitationRecipientDisplaySchema.nullable(),
          reservedAt: z.iso.datetime(),
          expiresAt: z.iso.datetime(),
          claimedAt: z.iso.datetime().nullable(),
        })
        .strict(),
    ),
    nextCursor: z.string().min(1).max(2048).nullable(),
  })
  .strict()
export type ServerOrganizationInvitationListResponse = z.infer<
  typeof serverOrganizationInvitationListResponseSchema
>

import { z } from 'zod'

import {
  type ServerReservationClaimRequest,
  type ServerReservationClaimResponse,
  type ServerReservationClaimStatusRequest,
  type ServerReservationClaimStatusResponse,
  type ServerReservationPreviewRequest,
  type ServerReservationPreviewResponse,
  type ServerReservationReadRequest,
  type ServerReservationReadResponse,
  serverReservationClaimRequestSchema,
  serverReservationClaimResponseSchema,
  serverReservationClaimStatusRequestSchema,
  serverReservationClaimStatusResponseSchema,
  serverReservationPreviewRequestSchema,
  serverReservationPreviewResponseSchema,
  serverReservationReadRequestSchema,
  serverReservationReadResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions, SubKitRequestOptions } from './requestOptions.js'

const capacityResultSchema = z.object({
  available: z.number().nullable(),
  capacity: z.number().nullable(),
  reserved: z.number(),
  used: z.number(),
})
const reservationResultSchema = capacityResultSchema.extend({ reservationId: z.string() })
const reservationCancellationSchema = z.object({
  status: z.literal('cancelled'),
  reservationId: z.string().nullable(),
})
const allocationResultSchema = capacityResultSchema.extend({ allocationId: z.string() })
const poolResultSchema = capacityResultSchema.extend({
  decision: z.enum(['applied', 'rejected', 'scheduled']).optional(),
  poolId: z.string(),
  reason: z
    .enum(['effective_date_required', 'policy_forbidden', 'usage_exceeds_capacity'])
    .optional(),
})
const poolCapacityPreviewSchema = capacityResultSchema.extend({
  decision: z.enum(['apply_immediately', 'schedule_at_renewal', 'reject']),
  effectiveAt: z.coerce.date().nullable(),
  newCapacity: z.number().nullable(),
  pendingCapacity: z.number().nullable(),
  policy: z.enum(['immediate', 'renewal_only', 'forbidden']),
  reason: z.enum([
    'allowed',
    'effective_date_required',
    'policy_forbidden',
    'usage_exceeds_capacity',
  ]),
})
const okResultSchema = z.object({ ok: z.literal(true) })
const freeEnrollmentResultSchema = z.object({
  accessSourceId: z.string(),
  allocationIds: z.array(z.string()),
  poolIds: z.array(z.string()),
})
const promotionRedemptionResultSchema = freeEnrollmentResultSchema.extend({
  promotionBenefitId: z.string(),
  promotionCampaignId: z.string(),
})

export type ReservationResult = z.infer<typeof reservationResultSchema>
export type AllocationResult = z.infer<typeof allocationResultSchema>
export type PoolResult = z.infer<typeof poolResultSchema>
export type PoolCapacityPreview = z.infer<typeof poolCapacityPreviewSchema>
export type MutationResult = z.infer<typeof okResultSchema>

export interface ReserveAccessInput {
  claimTokenHash?: string | null
  expiresAt?: Date | null
  inviteeReferenceHash?: string | null
  poolId: string
  quantity?: number
  reason: string
  subjectId?: string | null
}

export type ClaimReservationInput = Omit<ServerReservationClaimRequest, 'appId'> & {
  appId?: string
}

export type ReadReservationClaimInput = Omit<ServerReservationClaimStatusRequest, 'appId'> & {
  appId?: string
}

export interface AllocateAccessInput {
  externalReference: string
  poolId: string
  quantity?: number
  reason: string
  subjectId: string
}

export interface UpdateAllocationInput {
  action: 'suspend' | 'resume' | 'revoke'
  allocationId: string
  reason: string
}

export interface PreviewPoolCapacityInput {
  effectiveAt?: Date
  newCapacity: number | null
  poolId: string
}

export type UpdatePoolInput =
  | { action: 'suspend'; poolId: string; reason: string }
  | { action: 'resume'; poolId: string; reason: string }
  | { action: 'apply_scheduled_capacity'; poolId: string; reason: string }
  | {
      action: 'change_capacity'
      effectiveAt?: Date
      newCapacity: number | null
      poolId: string
      reason: string
    }

export type GetReservationInput = Omit<ServerReservationReadRequest, 'appId'> & { appId?: string }
export type PreviewReservationInput = Omit<ServerReservationPreviewRequest, 'appId'> & {
  appId?: string
}

export interface RevokeReservationInput {
  reason: string
  reservationId: string
}

export interface FreeEnrollmentInput {
  appId?: string
  planVersionId: string
  reason: string
  subjectId: string
}

export interface FreeEnrollmentResult {
  accessSourceId: string
  allocationIds: string[]
  poolIds: string[]
}

export interface RedeemPromotionCodeInput {
  appId?: string
  code: string
  reason: string
  subjectId: string
}

export interface PromotionRedemptionResult extends FreeEnrollmentResult {
  promotionBenefitId: string
  promotionCampaignId: string
}

export interface ManualProvisionInput {
  appId?: string
  originReference: string
  planVersionId: string
  reason: string
  subjectId: string
  validFrom: Date
  validUntil?: Date | null
}

interface AccessClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class AccessClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: AccessClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  enrollFree(
    input: FreeEnrollmentInput,
    options: SubKitMutationOptions,
  ): Promise<FreeEnrollmentResult> {
    return this.http.post('/api/server/free-enrollments', {
      ...options,
      body: { ...input, appId: resolveAppId(input.appId, this.appId) },
      responseSchema: freeEnrollmentResultSchema,
    })
  }

  redeemPromotionCode(
    input: RedeemPromotionCodeInput,
    options: SubKitMutationOptions,
  ): Promise<PromotionRedemptionResult> {
    return this.http.post('/api/server/promotion-codes/redeem', {
      ...options,
      body: { ...input, appId: resolveAppId(input.appId, this.appId) },
      responseSchema: promotionRedemptionResultSchema,
    })
  }

  reserve(input: ReserveAccessInput, options: SubKitMutationOptions): Promise<ReservationResult> {
    const { poolId, ...body } = input
    return this.http.post(`/api/server/access-pools/${encodeURIComponent(poolId)}/reservations`, {
      ...options,
      body: { ...body, expiresAt: body.expiresAt?.toISOString() ?? body.expiresAt },
      responseSchema: reservationResultSchema,
    })
  }

  getReservation(
    input: GetReservationInput,
    options: SubKitRequestOptions = {},
  ): Promise<ServerReservationReadResponse> {
    const request = serverReservationReadRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    const query = new URLSearchParams({ appId: request.appId })
    return this.http.get(
      `/api/server/access-reservations/${encodeURIComponent(request.reservationId)}?${query}`,
      {
        ...options,
        responseSchema: serverReservationReadResponseSchema.refine(
          (result) =>
            result.appId === request.appId && result.reservationId === request.reservationId,
          { message: 'Reservation response does not match the requested app and reservation' },
        ),
      },
    )
  }

  cancelReservationCreation(
    input: { poolId: string; reason: string },
    options: SubKitMutationOptions,
  ): Promise<{ status: 'cancelled'; reservationId: string | null }> {
    return this.http.delete(
      `/api/server/access-pools/${encodeURIComponent(input.poolId)}/reservations`,
      {
        ...options,
        body: { reason: input.reason },
        responseSchema: reservationCancellationSchema,
      },
    )
  }

  previewReservation(
    input: PreviewReservationInput,
    options: SubKitRequestOptions = {},
  ): Promise<ServerReservationPreviewResponse> {
    const request = serverReservationPreviewRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    return this.http.post('/api/server/access-reservations/preview', {
      ...options,
      body: request,
      responseSchema: serverReservationPreviewResponseSchema.refine(
        (result) => result.appId === request.appId && result.subjectId === request.subjectId,
        { message: 'Reservation preview does not match the requested app and recipient' },
      ),
    })
  }

  claim(
    input: ClaimReservationInput,
    options: SubKitMutationOptions,
  ): Promise<ServerReservationClaimResponse> {
    const request = serverReservationClaimRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    return this.http.post('/api/server/access-reservations/claim', {
      ...options,
      body: request,
      responseSchema: serverReservationClaimResponseSchema.refine(
        (result) =>
          result.appId === request.appId &&
          result.subjectId === request.subjectId &&
          result.reservationId === request.reservationId &&
          result.poolId === request.poolId &&
          result.accessSourceId === request.accessSourceId,
        { message: 'Reservation claim does not match the reviewed identity' },
      ),
    })
  }

  readReservationClaim(
    input: ReadReservationClaimInput,
    options: SubKitRequestOptions = {},
  ): Promise<ServerReservationClaimStatusResponse> {
    const request = serverReservationClaimStatusRequestSchema.parse({
      ...input,
      appId: resolveAppId(input.appId, this.appId),
    })
    return this.http.post('/api/server/access-reservations/claim/status', {
      ...options,
      body: request,
      responseSchema: serverReservationClaimStatusResponseSchema.refine(
        (result) =>
          result.appId === request.appId &&
          result.subjectId === request.subjectId &&
          result.reservationId === request.reservationId &&
          result.poolId === request.poolId &&
          result.accessSourceId === request.accessSourceId,
        { message: 'Reservation claim status does not match the requested identity' },
      ),
    })
  }

  allocate(input: AllocateAccessInput, options: SubKitMutationOptions): Promise<AllocationResult> {
    const { poolId, ...body } = input
    return this.http.post(`/api/server/access-pools/${encodeURIComponent(poolId)}/allocations`, {
      ...options,
      body,
      responseSchema: allocationResultSchema,
    })
  }

  updateAllocation(
    input: UpdateAllocationInput,
    options: SubKitMutationOptions,
  ): Promise<MutationResult> {
    const { allocationId, ...body } = input
    return this.http.patch(`/api/server/access-allocations/${encodeURIComponent(allocationId)}`, {
      ...options,
      body,
      responseSchema: okResultSchema,
    })
  }

  previewPoolCapacity(
    input: PreviewPoolCapacityInput,
    options: SubKitRequestOptions = {},
  ): Promise<PoolCapacityPreview> {
    const { poolId, ...body } = input
    return this.http.post(`/api/server/access-pools/${encodeURIComponent(poolId)}`, {
      ...options,
      body: { ...body, effectiveAt: body.effectiveAt?.toISOString() },
      responseSchema: poolCapacityPreviewSchema,
    })
  }

  updatePool(input: UpdatePoolInput, options: SubKitMutationOptions): Promise<PoolResult> {
    const { poolId, ...body } = input
    return this.http.patch(`/api/server/access-pools/${encodeURIComponent(poolId)}`, {
      ...options,
      body: serializePoolUpdate(body),
      responseSchema: poolResultSchema,
    })
  }

  revokeReservation(
    input: RevokeReservationInput,
    options: SubKitMutationOptions,
  ): Promise<MutationResult> {
    return this.http.delete(
      `/api/server/access-reservations/${encodeURIComponent(input.reservationId)}`,
      {
        ...options,
        body: { reason: input.reason },
        responseSchema: okResultSchema,
      },
    )
  }

  manualProvision(
    input: ManualProvisionInput,
    options: SubKitMutationOptions,
  ): Promise<AllocationResult> {
    return this.http.post('/api/server/manual-provisions', {
      ...options,
      body: {
        ...input,
        appId: resolveAppId(input.appId, this.appId),
        validFrom: input.validFrom.toISOString(),
        validUntil: input.validUntil?.toISOString() ?? input.validUntil,
      },
      responseSchema: allocationResultSchema,
    })
  }
}

function serializePoolUpdate(
  input:
    | { action: 'suspend'; reason: string }
    | { action: 'resume'; reason: string }
    | { action: 'apply_scheduled_capacity'; reason: string }
    | {
        action: 'change_capacity'
        effectiveAt?: Date
        newCapacity: number | null
        reason: string
      },
): unknown {
  if (input.action !== 'change_capacity') return input
  return { ...input, effectiveAt: input.effectiveAt?.toISOString() }
}

function resolveAppId(inputAppId: string | undefined, defaultAppId: string | undefined): string {
  const appId = inputAppId ?? defaultAppId
  if (appId == null || appId.trim() === '') {
    throw new Error('SubKit appId is required. Pass appId to the client or to this request.')
  }
  return appId
}

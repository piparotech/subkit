import { z } from 'zod'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions } from './requestOptions.js'

const capacityResultSchema = z.object({
  available: z.number().nullable(),
  capacity: z.number().nullable(),
  reserved: z.number(),
  used: z.number(),
})
const reservationResultSchema = capacityResultSchema.extend({ reservationId: z.string() })
const allocationResultSchema = capacityResultSchema.extend({ allocationId: z.string() })
const poolResultSchema = capacityResultSchema.extend({ poolId: z.string() })
const okResultSchema = z.object({ ok: z.literal(true) })

export type ReservationResult = z.infer<typeof reservationResultSchema>
export type AllocationResult = z.infer<typeof allocationResultSchema>
export type PoolResult = z.infer<typeof poolResultSchema>
export type MutationResult = z.infer<typeof okResultSchema>

export interface ReserveAccessInput {
  claimTokenHash?: string | null
  expiresAt?: Date | null
  inviteeReferenceHash?: string | null
  poolId: string
  quantity?: number
  subjectId?: string | null
}

export interface ClaimReservationInput {
  appId?: string
  claimTokenHash: string
  subjectId: string
}

export interface AllocateAccessInput {
  externalReference: string
  poolId: string
  quantity?: number
  subjectId: string
}

export interface UpdateAllocationInput {
  action: 'suspend' | 'resume' | 'revoke'
  allocationId: string
  reason: string
}

export type UpdatePoolInput =
  | { action: 'suspend'; poolId: string; reason: string }
  | { action: 'resume'; poolId: string; reason: string }
  | {
      action: 'change_capacity'
      effectiveAt?: Date
      newCapacity: number | null
      poolId: string
      reason: string
    }

export interface RevokeReservationInput {
  reason: string
  reservationId: string
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

  reserve(input: ReserveAccessInput, options: SubKitMutationOptions): Promise<ReservationResult> {
    const { poolId, ...body } = input
    return this.http.post(`/api/server/access-pools/${encodeURIComponent(poolId)}/reservations`, {
      ...options,
      body: { ...body, expiresAt: body.expiresAt?.toISOString() ?? body.expiresAt },
      responseSchema: reservationResultSchema,
    })
  }

  claim(input: ClaimReservationInput, options: SubKitMutationOptions): Promise<AllocationResult> {
    return this.http.post('/api/server/access-reservations/claim', {
      ...options,
      body: { ...input, appId: resolveAppId(input.appId, this.appId) },
      responseSchema: allocationResultSchema,
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

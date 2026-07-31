import { z } from 'zod'

import {
  type ServerContractPlanVersionsResponse,
  type ServerLicenseDetailResponse,
  type ServerLicenseKind,
  type ServerLicenseListResponse,
  serverContractPlanVersionsResponseSchema,
  serverLicenseDetailResponseSchema,
  serverLicenseListResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions, SubKitRequestOptions } from './requestOptions.js'

const contractLifecycleActionSchema = z.enum([
  'renew',
  'resume',
  'revert_non_renewal',
  'revoke',
  'schedule_non_renewal',
  'suspend',
])
const contractLifecyclePreviewSchema = z.object({
  action: contractLifecycleActionSchema,
  affectedAllocationCount: z.number(),
  affectedEntitlements: z.array(z.string()),
  afterAutoRenews: z.boolean(),
  afterState: z.string(),
  afterTermEnd: z.string().nullable(),
  beforeAutoRenews: z.boolean(),
  beforeState: z.string(),
  beforeTermEnd: z.string().nullable(),
  contractNumber: z.string().nullable(),
  externalContractId: z.string(),
  sourceId: z.string(),
  warnings: z.array(z.string()),
})
const contractLifecycleApplySchema = contractLifecyclePreviewSchema.extend({ ok: z.literal(true) })

export type ContractLifecyclePreview = z.infer<typeof contractLifecyclePreviewSchema>
export type ContractLifecycleResult = z.infer<typeof contractLifecycleApplySchema>

export interface ListLicensesInput {
  appId?: string
  cursor?: string | null
  kind?: 'individual' | 'club'
  limit?: number
  query?: string
  state?: 'pending' | 'active' | 'suspended' | 'expired' | 'revoked'
}

export type ContractLifecycleAction = z.infer<typeof contractLifecycleActionSchema>

export interface ContractLifecyclePreviewInput {
  action: ContractLifecycleAction
  appId?: string
  newTermEnd?: Date
  sourceId: string
}

export interface ContractLifecycleApplyInput {
  action: ContractLifecycleAction
  appId?: string
  expectedAutoRenews?: boolean
  expectedState: string
  expectedTermEnd?: Date | null
  newTermEnd?: Date
  reason: string
  sourceId: string
}

export type { ServerLicenseKind }

interface LicensesClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class LicensesClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: LicensesClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  list(
    input: ListLicensesInput = {},
    options: SubKitRequestOptions = {},
  ): Promise<ServerLicenseListResponse> {
    return this.http.post('/api/server/licenses', {
      ...options,
      body: {
        appId: resolveAppId(input.appId, this.appId),
        cursor: input.cursor,
        kind: input.kind,
        limit: input.limit,
        query: input.query,
        state: input.state,
      },
      responseSchema: serverLicenseListResponseSchema,
    })
  }

  get(
    input: { appId?: string; sourceId: string },
    options: SubKitRequestOptions = {},
  ): Promise<ServerLicenseDetailResponse> {
    const appId = resolveAppId(input.appId, this.appId)
    const query = new URLSearchParams({ appId }).toString()
    return this.http.get(`/api/server/licenses/${encodeURIComponent(input.sourceId)}?${query}`, {
      ...options,
      responseSchema: serverLicenseDetailResponseSchema,
    })
  }

  contractPlanVersions(
    input: { appId?: string } = {},
    options: SubKitRequestOptions = {},
  ): Promise<ServerContractPlanVersionsResponse> {
    return this.http.post('/api/server/contract-plan-versions', {
      ...options,
      body: { appId: resolveAppId(input.appId, this.appId) },
      responseSchema: serverContractPlanVersionsResponseSchema,
    })
  }

  previewContractLifecycle(
    input: ContractLifecyclePreviewInput,
    options: SubKitRequestOptions = {},
  ): Promise<ContractLifecyclePreview> {
    return this.http.post(`/api/server/contracts/${encodeURIComponent(input.sourceId)}/lifecycle`, {
      ...options,
      body: {
        action: input.action,
        appId: resolveAppId(input.appId, this.appId),
        newTermEnd: input.newTermEnd?.toISOString(),
      },
      responseSchema: contractLifecyclePreviewSchema,
    })
  }

  applyContractLifecycle(
    input: ContractLifecycleApplyInput,
    options: SubKitMutationOptions,
  ): Promise<ContractLifecycleResult> {
    return this.http.patch(
      `/api/server/contracts/${encodeURIComponent(input.sourceId)}/lifecycle`,
      {
        ...options,
        body: {
          action: input.action,
          appId: resolveAppId(input.appId, this.appId),
          expectedAutoRenews: input.expectedAutoRenews,
          expectedState: input.expectedState,
          expectedTermEnd: input.expectedTermEnd?.toISOString() ?? input.expectedTermEnd,
          newTermEnd: input.newTermEnd?.toISOString(),
          reason: input.reason,
        },
        responseSchema: contractLifecycleApplySchema,
      },
    )
  }
}

function resolveAppId(inputAppId: string | undefined, defaultAppId: string | undefined): string {
  const appId = inputAppId ?? defaultAppId
  if (appId == null || appId.trim() === '') {
    throw new Error('SubKit appId is required. Pass appId to the client or to this request.')
  }
  return appId
}

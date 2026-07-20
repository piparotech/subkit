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

const contractLifecyclePreviewSchema = z.object({
  action: z.enum(['suspend', 'resume', 'revoke']),
  affectedAllocationCount: z.number(),
  affectedEntitlements: z.array(z.string()),
  afterState: z.string(),
  beforeState: z.string(),
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

export interface ContractLifecyclePreviewInput {
  action: 'suspend' | 'resume' | 'revoke'
  appId?: string
  sourceId: string
}

export interface ContractLifecycleApplyInput {
  action: 'suspend' | 'resume' | 'revoke'
  appId?: string
  expectedState: string
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
      body: { action: input.action, appId: resolveAppId(input.appId, this.appId) },
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
          expectedState: input.expectedState,
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

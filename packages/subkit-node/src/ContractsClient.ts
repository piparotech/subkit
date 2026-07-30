import { z } from 'zod'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions } from './requestOptions.js'

const contractResultSchema = z.object({
  accessSourceId: z.string(),
  poolIds: z.array(z.string()),
})

export type ContractResult = z.infer<typeof contractResultSchema>

export interface CreateContractInput {
  appId?: string
  autoRenews?: boolean
  billingAccountId: string
  contractNumber?: string | null
  externalContractId: string
  licenseeSubjectId?: string | null
  notes?: string | null
  planVersionId: string
  reason: string
  signedAt?: Date | null
  termEnd?: Date | null
  termStart: Date
}

interface ContractsClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class ContractsClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: ContractsClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  create(input: CreateContractInput, options: SubKitMutationOptions): Promise<ContractResult> {
    return this.http.post('/api/server/contracts', {
      ...options,
      body: {
        ...input,
        appId: resolveAppId(input.appId, this.appId),
        signedAt: input.signedAt?.toISOString() ?? input.signedAt,
        termEnd: input.termEnd?.toISOString() ?? input.termEnd,
        termStart: input.termStart.toISOString(),
      },
      responseSchema: contractResultSchema,
    })
  }
}

function resolveAppId(inputAppId: string | undefined, defaultAppId: string | undefined): string {
  const appId = inputAppId ?? defaultAppId
  if (appId == null || appId.trim() === '') {
    throw new Error('SubKit appId is required. Pass appId to the client or to this request.')
  }
  return appId
}

import { z } from 'zod'

import {
  type ServerProductsRequest,
  type ServerProductsResponse,
  serverProductsResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions, SubKitRequestOptions } from './requestOptions.js'

const planVersionLifecycleResultSchema = z.object({
  planVersionId: z.string(),
  state: z.enum(['published', 'retired']),
})

export type PlanVersionLifecycleResult = z.infer<typeof planVersionLifecycleResultSchema>

export interface UpdatePlanVersionLifecycleInput {
  action: 'publish' | 'retire'
  planVersionId: string
  reason: string
}

interface ProductsClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class ProductsClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: ProductsClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  updatePlanVersionLifecycle(
    input: UpdatePlanVersionLifecycleInput,
    options: SubKitMutationOptions,
  ): Promise<PlanVersionLifecycleResult> {
    const { planVersionId, ...body } = input
    return this.http.patch(`/api/server/plan-versions/${encodeURIComponent(planVersionId)}`, {
      ...options,
      body,
      responseSchema: planVersionLifecycleResultSchema,
    })
  }

  list(
    input: Omit<ServerProductsRequest, 'appId'> & { appId?: string } = {},
    options: SubKitRequestOptions = {},
  ): Promise<ServerProductsResponse> {
    return this.http.post('/api/server/products', {
      ...options,
      body: {
        ...input,
        appId: resolveAppId(input.appId, this.appId),
      },
      responseSchema: serverProductsResponseSchema,
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

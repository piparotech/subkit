import {
  type ServerBillingManagementResponse,
  serverBillingManagementResponseSchema,
  type ServerBillingPortalSessionRequest,
  type ServerBillingPortalSessionResponse,
  type ServerDirectBillingSummary,
  type ServerDirectBillingSummaryRequest,
  serverBillingPortalSessionResponseSchema,
  serverDirectBillingSummaryResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions, SubKitRequestOptions } from './requestOptions.js'

export type CreateBillingPortalSessionInput = Omit<ServerBillingPortalSessionRequest, 'appId'> & {
  appId?: string
}
export type GetDirectBillingSummaryInput = Omit<ServerDirectBillingSummaryRequest, 'appId'> & {
  appId?: string
}

interface BillingClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class BillingClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: BillingClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  createPortalSession(
    input: CreateBillingPortalSessionInput,
    options: SubKitMutationOptions,
  ): Promise<ServerBillingPortalSessionResponse> {
    return this.http.post('/api/server/billing-portal/sessions', {
      ...options,
      body: {
        appId: resolveAppId(input.appId, this.appId),
        reason: input.reason,
        ...(input.returnTarget == null ? {} : { returnTarget: input.returnTarget }),
        subjectId: input.subjectId,
      },
      responseSchema: serverBillingPortalSessionResponseSchema,
    })
  }

  async getManagement(
    input: GetDirectBillingSummaryInput,
    options: SubKitRequestOptions = {},
  ): Promise<ServerBillingManagementResponse> {
    const appId = resolveAppId(input.appId, this.appId)
    const result = await this.http.post('/api/server/billing/management', {
      ...options,
      body: { appId, subjectId: input.subjectId },
      responseSchema: serverBillingManagementResponseSchema,
    })
    if (result.appId !== appId || result.subjectId !== input.subjectId) {
      throw new Error('Billing management identity mismatch')
    }
    return result
  }

  getSummary(
    input: GetDirectBillingSummaryInput,
    options: SubKitRequestOptions = {},
  ): Promise<ServerDirectBillingSummary> {
    return this.http.post('/api/server/direct-billing/summary', {
      ...options,
      body: {
        appId: resolveAppId(input.appId, this.appId),
        subjectId: input.subjectId,
      },
      responseSchema: serverDirectBillingSummaryResponseSchema,
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

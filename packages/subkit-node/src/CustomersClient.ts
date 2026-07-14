import { z } from 'zod'

import {
  type ServerCustomerInfoRequest,
  type ServerCustomerInfoResponse,
  serverCustomerInfoResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions, SubKitRequestOptions } from './requestOptions.js'

const customerRecordSchema = z.object({ id: z.string(), status: z.string() })

export type CustomerRecord = z.infer<typeof customerRecordSchema>

export interface UpsertSubjectInput {
  appId?: string
  countryCode?: string | null
  displayName?: string | null
  externalId: string
  kind: 'app_user' | 'organization' | 'service_account'
  locale?: string | null
  reason: string
}

export interface CreateBillingAccountInput {
  displayName: string
  externalId?: string | null
  kind: 'individual' | 'organization'
  metadataJson?: string
  reason: string
}

interface CustomersClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class CustomersClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: CustomersClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  upsertSubject(
    input: UpsertSubjectInput,
    options: SubKitMutationOptions,
  ): Promise<CustomerRecord> {
    return this.http.post('/api/server/subjects/upsert', {
      ...options,
      body: { ...input, appId: resolveAppId(input.appId, this.appId) },
      responseSchema: customerRecordSchema,
    })
  }

  createBillingAccount(
    input: CreateBillingAccountInput,
    options: SubKitMutationOptions,
  ): Promise<CustomerRecord> {
    return this.http.post('/api/server/billing-accounts', {
      ...options,
      body: input,
      responseSchema: customerRecordSchema,
    })
  }

  getCustomerInfo(
    input: Omit<ServerCustomerInfoRequest, 'appId'> & { appId?: string },
    options: SubKitRequestOptions = {},
  ): Promise<ServerCustomerInfoResponse> {
    return this.http.post('/api/server/customer-info', {
      ...options,
      body: {
        accessContext: input.accessContext,
        appId: resolveAppId(input.appId, this.appId),
        appUserId: input.appUserId,
        environment: input.environment,
      },
      responseSchema: serverCustomerInfoResponseSchema,
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

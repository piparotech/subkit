import {
  type ServerCustomerInfoRequest,
  type ServerCustomerInfoResponse,
  serverCustomerInfoResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitRequestOptions } from './requestOptions.js'

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

  getCustomerInfo(
    input: Omit<ServerCustomerInfoRequest, 'appId'> & { appId?: string },
    options: SubKitRequestOptions = {},
  ): Promise<ServerCustomerInfoResponse> {
    return this.http.post('/api/server/customer-info', {
      ...options,
      body: {
        appId: resolveAppId(input.appId, this.appId),
        appUserId: input.appUserId,
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

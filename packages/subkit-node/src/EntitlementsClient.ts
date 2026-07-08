import {
  type ServerEntitlementCheckRequest,
  type ServerEntitlementCheckResponse,
  serverEntitlementCheckResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitRequestOptions } from './requestOptions.js'

interface EntitlementsClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class EntitlementsClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: EntitlementsClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  check(
    input: Omit<ServerEntitlementCheckRequest, 'appId'> & { appId?: string },
    options: SubKitRequestOptions = {},
  ): Promise<ServerEntitlementCheckResponse> {
    return this.http.post('/api/server/entitlements/check', {
      ...options,
      body: {
        appId: resolveAppId(input.appId, this.appId),
        appUserId: input.appUserId,
        entitlement: input.entitlement,
      },
      responseSchema: serverEntitlementCheckResponseSchema,
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

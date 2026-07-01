import { serverOfferingsResponseSchema, type ServerOfferingsRequest, type ServerOfferingsResponse } from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitRequestOptions } from './requestOptions.js'

interface OfferingsClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class OfferingsClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: OfferingsClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  list(input: Omit<ServerOfferingsRequest, 'appId'> & { appId?: string } = {}, options: SubKitRequestOptions = {}): Promise<ServerOfferingsResponse> {
    return this.http.post('/api/server/offerings', {
      ...options,
      body: {
        ...input,
        appId: resolveAppId(input.appId, this.appId),
      },
      responseSchema: serverOfferingsResponseSchema,
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

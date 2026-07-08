import {
  type ServerProductsRequest,
  type ServerProductsResponse,
  serverProductsResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitRequestOptions } from './requestOptions.js'

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

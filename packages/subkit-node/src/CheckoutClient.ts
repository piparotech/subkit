import {
  type ServerDirectCheckoutSessionRequest,
  type ServerDirectCheckoutSessionResponse,
  serverDirectCheckoutSessionResponseSchema,
} from '@piparotech/subkit-core'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions } from './requestOptions.js'

export type CreateDirectCheckoutSessionInput = Omit<ServerDirectCheckoutSessionRequest, 'appId'> & {
  appId?: string
}

interface CheckoutClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class CheckoutClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: CheckoutClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  createSession(
    input: CreateDirectCheckoutSessionInput,
    options: SubKitMutationOptions,
  ): Promise<ServerDirectCheckoutSessionResponse> {
    return this.http.post('/api/server/direct-billing/checkout-session', {
      ...options,
      body: {
        appId: resolveAppId(input.appId, this.appId),
        billingAccountId: input.billingAccountId,
        offeringIdentifier: input.offeringIdentifier,
        packageIdentifier: input.packageIdentifier,
        reason: input.reason,
        ...(input.returnTarget == null ? {} : { returnTarget: input.returnTarget }),
        subjectId: input.subjectId,
      },
      responseSchema: serverDirectCheckoutSessionResponseSchema,
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

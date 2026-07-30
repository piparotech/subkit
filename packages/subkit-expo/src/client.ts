import {
  type CustomerInfo,
  type IapReconcileRequest,
  type NormalizedStorePurchase,
  type PurchaseSyncReason,
  type PurchaseSyncResult,
  type RuntimeDeviceActivationResult,
  type RuntimeOfferingsResponse,
  type StoreIdentityHints,
  type SubKitErrorCode,
  customerInfoSchema,
  iapReconcileResponseSchema,
  isRetryableSubKitErrorCode,
  runtimeDeviceActivationResultSchema,
  runtimeOfferingsResponseSchema,
  subKitApiErrorResponseSchema,
} from '@piparotech/subkit-core'

import type { SubKitIapPurchase } from './types.js'

export interface SubKitRuntimeClientOptions {
  apiBaseUrl: string
  sdkKey: string | (() => Promise<string>)
}

export class SubKitRuntimeError extends Error {
  readonly code: SubKitErrorCode
  readonly requestId: string | undefined
  readonly retryable: boolean
  readonly status: number

  constructor(input: {
    code: SubKitErrorCode
    message: string
    requestId?: string
    retryable?: boolean
    status: number
  }) {
    super(input.message)
    this.name = 'SubKitRuntimeError'
    this.code = input.code
    this.requestId = input.requestId
    this.retryable = input.retryable ?? isRetryableSubKitErrorCode(input.code)
    this.status = input.status
  }
}

export class SubKitRuntimeClient {
  private readonly apiBaseUrl: string
  private readonly sdkKey: string | (() => Promise<string>)

  constructor(options: SubKitRuntimeClientOptions) {
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '')
    this.sdkKey = options.sdkKey
  }

  async getCustomerInfo(
    appUserId: string,
    accessContext?: string,
    deviceAccessToken?: string,
  ): Promise<CustomerInfo> {
    const response = await this.post('/api/runtime/customer-info', {
      accessContext,
      appUserId,
      deviceAccessToken,
    })
    return customerInfoSchema.parse(response)
  }

  async getOfferings(
    input: {
      appUserId?: string
      placement?: string
      platform?: 'ios' | 'android'
    } = {},
  ): Promise<RuntimeOfferingsResponse> {
    const response = await this.post('/api/runtime/offerings', input)
    return runtimeOfferingsResponseSchema.parse(response)
  }

  async listDeviceActivations(input: {
    activationGroupKey: string
    managementToken: string
  }): Promise<RuntimeDeviceActivationResult> {
    const response = await this.post('/api/runtime/devices/list', input)
    return runtimeDeviceActivationResultSchema.parse(response)
  }

  async mutateDeviceActivation(input: {
    activationGroupKey: string
    idempotencyKey: string
    installationId: string
    managementToken: string
    operation: 'claim' | 'renew' | 'replace'
    platform: 'ios' | 'android'
    replaceActivationId?: string
  }): Promise<RuntimeDeviceActivationResult> {
    const { operation, ...payload } = input
    const response = await this.post(`/api/runtime/devices/${operation}`, payload)
    return runtimeDeviceActivationResultSchema.parse(response)
  }

  async revokeDeviceActivation(input: {
    activationGroupKey: string
    activationId: string
    idempotencyKey: string
    managementToken: string
  }): Promise<RuntimeDeviceActivationResult> {
    const response = await this.post('/api/runtime/devices/revoke', input)
    return runtimeDeviceActivationResultSchema.parse(response)
  }

  async reconcile(input: {
    accessContext?: string
    appUserId?: string
    installationId: string
    platform: 'ios' | 'android'
    purchases: NormalizedStorePurchase[]
    reason: PurchaseSyncReason
    sessionId: string
    storeIdentities?: StoreIdentityHints
  }): Promise<PurchaseSyncResult> {
    const request: IapReconcileRequest = {
      accessContext: input.accessContext,
      appUserId: input.appUserId,
      installationId: input.installationId,
      platform: input.platform,
      purchases: input.purchases,
      reason: input.reason,
      sessionId: input.sessionId,
      storeIdentities: input.storeIdentities,
    }
    const response = await this.post('/api/runtime/iap/reconcile', request)
    return iapReconcileResponseSchema.parse(response)
  }

  private async post(path: string, payload: unknown): Promise<unknown> {
    const sdkKey = typeof this.sdkKey === 'string' ? this.sdkKey : await this.sdkKey()
    let response: Response
    try {
      response = await fetch(`${this.apiBaseUrl}${path}`, {
        body: JSON.stringify(payload),
        headers: {
          authorization: `Bearer ${sdkKey}`,
          'content-type': 'application/json',
        },
        method: 'POST',
      })
    } catch {
      throw new SubKitRuntimeError({
        code: 'network',
        message: 'SubKit runtime network request failed',
        status: 0,
      })
    }

    const body = await response.json().catch(() => null)
    if (!response.ok) {
      throw createRuntimeErrorFromResponse(response.status, body)
    }

    return body
  }
}

export function normalizePurchaseForReconcile(
  purchase: SubKitIapPurchase,
): NormalizedStorePurchase {
  return {
    environment: purchase.environment,
    linkedPurchaseToken: purchase.linkedPurchaseToken,
    orderId: purchase.orderId,
    originalTransactionId: purchase.originalTransactionId,
    ownershipType: purchase.ownershipType,
    productId: purchase.productId,
    purchaseTime: purchase.transactionDate,
    purchaseToken: purchase.purchaseToken,
    quantity: purchase.quantity,
    rawPayload: purchase.raw,
    receipt: purchase.receipt,
    store: purchase.store,
    storeProductId: purchase.productId,
    transactionId: purchase.transactionId,
  }
}

function createRuntimeErrorFromResponse(status: number, body: unknown): SubKitRuntimeError {
  const parsed = subKitApiErrorResponseSchema.safeParse(body)
  if (parsed.success) {
    return new SubKitRuntimeError({
      code: parsed.data.error.code,
      message: parsed.data.error.message,
      requestId: parsed.data.error.requestId,
      status,
    })
  }

  return new SubKitRuntimeError({
    code: status === 401 ? 'unauthorized' : status >= 500 ? 'server_error' : 'invalid_request',
    message: `SubKit runtime request failed with ${status}`,
    status,
  })
}

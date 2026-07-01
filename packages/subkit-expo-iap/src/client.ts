import {
  customerInfoSchema,
  iapReconcileResponseSchema,
  runtimeOfferingsResponseSchema,
  type CustomerInfo,
  type IapReconcileRequest,
  type NormalizedStorePurchase,
  type PurchaseSyncReason,
  type PurchaseSyncResult,
  type RuntimeOfferingsResponse,
  type StoreIdentityHints,
} from '@piparotech/subkit-core'

import type { SubKitIapPurchase } from './types'

export interface SubKitRuntimeClientOptions {
  apiBaseUrl: string
  appId: string
  sdkKey: string
}

export class SubKitRuntimeClient {
  private readonly apiBaseUrl: string
  private readonly appId: string
  private readonly sdkKey: string

  constructor(options: SubKitRuntimeClientOptions) {
    this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, '')
    this.appId = options.appId
    this.sdkKey = options.sdkKey
  }

  async getCustomerInfo(appUserId: string): Promise<CustomerInfo> {
    const response = await this.post('/api/runtime/customer-info', { appId: this.appId, appUserId })
    return customerInfoSchema.parse(response)
  }

  async getOfferings(input: { appUserId?: string; placement?: string; platform?: 'ios' | 'android' } = {}): Promise<RuntimeOfferingsResponse> {
    const response = await this.post('/api/runtime/offerings', { appId: this.appId, ...input })
    return runtimeOfferingsResponseSchema.parse(response)
  }

  async reconcile(input: {
    appUserId?: string
    installationId: string
    platform: 'ios' | 'android'
    purchases: NormalizedStorePurchase[]
    reason: PurchaseSyncReason
    sessionId: string
    storeIdentities?: StoreIdentityHints
  }): Promise<PurchaseSyncResult> {
    const request: IapReconcileRequest = {
      appId: this.appId,
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
    const response = await fetch(`${this.apiBaseUrl}${path}`, {
      body: JSON.stringify(payload),
      headers: {
        authorization: `Bearer ${this.sdkKey}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    const body = await response.json().catch(() => null)
    if (!response.ok) {
      const message = readErrorMessage(body) ?? `SubKit runtime request failed with ${response.status}`
      throw new Error(message)
    }

    return body
  }
}

export function normalizePurchaseForReconcile(purchase: SubKitIapPurchase): NormalizedStorePurchase {
  return {
    environment: purchase.environment,
    originalTransactionId: purchase.originalTransactionId,
    ownershipType: purchase.ownershipType,
    productId: purchase.productId,
    purchaseTime: purchase.transactionDate,
    purchaseToken: purchase.purchaseToken,
    rawPayload: purchase.raw,
    store: purchase.store,
    storeProductId: purchase.productId,
    transactionId: purchase.transactionId,
  }
}

function readErrorMessage(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || !('error' in value)) return null
  const error = value.error
  return typeof error === 'string' ? error : null
}

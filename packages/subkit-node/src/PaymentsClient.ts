import { z } from 'zod'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions } from './requestOptions.js'

const paymentResultSchema = z.object({
  accessSourceId: z.string().nullable(),
  amountMicros: z.number(),
  appId: z.string(),
  billingAccountId: z.string().nullable(),
  currencyCode: z.string(),
  externalId: z.string(),
  id: z.string(),
  kind: z.enum(['authorization', 'charge', 'renewal', 'refund', 'chargeback', 'adjustment']),
  occurredAt: z.coerce.date(),
  provider: z.enum(['stripe', 'external', 'manual']),
  state: z.enum(['pending', 'succeeded', 'failed', 'reversed']),
})

export type PaymentResult = z.infer<typeof paymentResultSchema>

export interface RecordPaymentInput {
  accessSourceId?: string | null
  amountMicros: number
  appId?: string
  billingAccountId?: string | null
  currencyCode: string
  externalId: string
  kind: PaymentResult['kind']
  occurredAt: Date
  provider: PaymentResult['provider']
  reason: string
  state: PaymentResult['state']
}

interface PaymentsClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class PaymentsClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: PaymentsClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  record(input: RecordPaymentInput, options: SubKitMutationOptions): Promise<PaymentResult> {
    return this.http.post('/api/server/payments', {
      ...options,
      body: {
        ...input,
        appId: resolveAppId(input.appId, this.appId),
        occurredAt: input.occurredAt.toISOString(),
      },
      responseSchema: paymentResultSchema,
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

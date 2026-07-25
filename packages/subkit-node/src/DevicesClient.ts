import { z } from 'zod'

import type { HttpClient } from './HttpClient.js'
import type { SubKitMutationOptions, SubKitRequestOptions } from './requestOptions.js'

const deviceSchema = z.object({
  activationGroupKey: z.string(),
  activationId: z.string(),
  beneficiarySubjectId: z.string(),
  environment: z.enum(['production', 'sandbox', 'test']),
  expiresAt: z.string(),
  installationLabel: z.string().nullable(),
  lastSeenAt: z.string(),
  policyVersionId: z.string(),
  state: z.string(),
})
const deviceListSchema = z.object({ devices: z.array(deviceSchema) })
const deviceRevokeSchema = z.object({ activation: deviceSchema, ok: z.literal(true) })
const budgetResetSchema = z.object({ ok: z.literal(true), resetAt: z.string() })

export type ServerDeviceActivation = z.infer<typeof deviceSchema>

interface DevicesClientOptions {
  appId: string | undefined
  http: HttpClient
}

export class DevicesClient {
  private readonly appId: string | undefined
  private readonly http: HttpClient

  constructor(options: DevicesClientOptions) {
    this.appId = options.appId
    this.http = options.http
  }

  list(
    input: {
      activationGroupKey?: string
      appId?: string
      beneficiarySubjectId?: string
      environment?: 'production' | 'sandbox' | 'test'
    } = {},
    options: SubKitRequestOptions = {},
  ): Promise<{ devices: ServerDeviceActivation[] }> {
    return this.http.post('/api/server/devices', {
      ...options,
      body: { ...input, appId: resolveAppId(input.appId, this.appId) },
      responseSchema: deviceListSchema,
    })
  }

  revoke(
    input: { activationId: string; appId?: string; reason: string },
    options: SubKitMutationOptions,
  ): Promise<{ activation: ServerDeviceActivation; ok: true }> {
    return this.http.delete(`/api/server/devices/${encodeURIComponent(input.activationId)}`, {
      ...options,
      body: { appId: resolveAppId(input.appId, this.appId), reason: input.reason },
      responseSchema: deviceRevokeSchema,
    })
  }

  resetChangeBudget(
    input: {
      activationGroupKey: string
      appId?: string
      beneficiarySubjectId: string
      environment: 'production' | 'sandbox' | 'test'
      reason: string
    },
    options: SubKitMutationOptions,
  ): Promise<{ ok: true; resetAt: string }> {
    return this.http.post('/api/server/devices/budget-reset', {
      ...options,
      body: { ...input, appId: resolveAppId(input.appId, this.appId) },
      responseSchema: budgetResetSchema,
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

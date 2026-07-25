import { z } from 'zod'

export const subKitErrorCodeSchema = z.enum([
  'cancelled',
  'not_ready',
  'store_unavailable',
  'product_unavailable',
  'already_owned',
  'network',
  'validation_failed',
  'ownership_conflict',
  'login_required',
  'beneficiary_conflict',
  'device_selection_required',
  'device_replacement_cooldown',
  'device_change_limit_reached',
  'device_replaced',
  'rate_limited',
  'unauthorized',
  'forbidden',
  'not_found',
  'invalid_request',
  'idempotency_conflict',
  'webhook_verification_failed',
  'service_unavailable',
  'server_error',
  'unknown',
])

export type SubKitErrorCode = z.infer<typeof subKitErrorCodeSchema>

export interface CreateSubKitErrorInput {
  code: SubKitErrorCode
  message: string
  metadata?: Record<string, string | number | boolean | null>
  retryable?: boolean
}

export interface SubKitErrorShape {
  code: SubKitErrorCode
  message: string
  metadata?: Record<string, string | number | boolean | null>
  retryable: boolean
}

export const subKitApiErrorResponseSchema = z.object({
  error: z.object({
    code: subKitErrorCodeSchema,
    message: z.string().min(1),
    requestId: z.string().min(1).optional(),
    details: z.unknown().optional(),
  }),
})

export type SubKitApiErrorResponse = z.infer<typeof subKitApiErrorResponseSchema>

export function createSubKitError(input: CreateSubKitErrorInput): SubKitErrorShape {
  return {
    code: input.code,
    message: input.message,
    metadata: input.metadata,
    retryable: input.retryable ?? isRetryableSubKitErrorCode(input.code),
  }
}

export function isRetryableSubKitErrorCode(code: SubKitErrorCode): boolean {
  return (
    code === 'network' ||
    code === 'rate_limited' ||
    code === 'service_unavailable' ||
    code === 'server_error'
  )
}

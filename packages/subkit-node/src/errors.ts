import type { SubKitErrorCode } from '@piparotech/subkit-core'

export class SubKitApiError extends Error {
  readonly code: SubKitErrorCode
  readonly details: unknown
  readonly requestId: string | null
  readonly status: number

  constructor(input: {
    code: SubKitErrorCode
    details?: unknown
    message: string
    requestId?: string | null
    status: number
  }) {
    super(input.message)
    this.name = 'SubKitApiError'
    this.code = input.code
    this.details = input.details
    this.requestId = input.requestId ?? null
    this.status = input.status
  }
}

export function isSubKitApiError(error: unknown): error is SubKitApiError {
  return error instanceof SubKitApiError
}

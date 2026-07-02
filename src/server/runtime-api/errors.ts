import type { SubKitErrorCode } from '@piparotech/subkit-core'

export class SubKitServerApiError extends Error {
  readonly code: SubKitErrorCode
  readonly details: unknown
  readonly status: number

  constructor(input: { code: SubKitErrorCode; details?: unknown; message: string; status: number }) {
    super(input.message)
    this.name = 'SubKitServerApiError'
    this.code = input.code
    this.details = input.details
    this.status = input.status
  }
}

export function jsonApiError(input: { code: SubKitErrorCode; details?: unknown; message: string; status: number }): Response {
  const requestId = crypto.randomUUID()
  return Response.json(
    {
      error: {
        code: input.code,
        details: input.details,
        message: input.message,
        requestId,
      },
    },
    {
      headers: { 'x-subkit-request-id': requestId },
      status: input.status,
    },
  )
}

export function jsonUnknownApiError(): Response {
  return jsonApiError({ code: 'server_error', message: 'SubKit server API request failed', status: 500 })
}

export function jsonApiErrorFromThrown(error: unknown): Response {
  if (error instanceof SubKitServerApiError) {
    return jsonApiError({ code: error.code, details: error.details, message: error.message, status: error.status })
  }

  if (error instanceof SyntaxError) {
    return jsonApiError({ code: 'invalid_request', message: 'Invalid JSON request body', status: 400 })
  }

  console.error('SubKit runtime API failed', error)
  return jsonUnknownApiError()
}

export interface NormalizedIapError {
  code?: string
  message: string
  raw: unknown
}

export function normalizeIapError(error: unknown): NormalizedIapError {
  if (isRecord(error)) {
    const message = typeof error.message === 'string' ? error.message : 'Unknown IAP error'
    const code = typeof error.code === 'string' ? error.code : undefined
    return { code, message, raw: error }
  }

  if (error instanceof Error) {
    return { message: error.message, raw: error }
  }

  return { message: 'Unknown IAP error', raw: error }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

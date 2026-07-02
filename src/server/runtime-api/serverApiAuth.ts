import { timingSafeEqual } from 'node:crypto'

import { parseServerEnv } from '~/server/env'

import { sha256Hex } from '~/server/auth/crypto'
import { jsonApiError } from '~/server/runtime-api/errors'

export function authorizeServerApiRequest(request: Request): Response | null {
  const key = parseServerEnv(process.env).SUBKIT_SERVER_API_KEY
  if (key == null) {
    return jsonApiError({ code: 'service_unavailable', message: 'SubKit server API key is not configured', status: 503 })
  }

  const token = readBearerToken(request)
  if (token == null || !securelyCompareSecrets(token, key)) {
    return jsonApiError({ code: 'unauthorized', message: 'Unauthorized', status: 401 })
  }

  return null
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (header == null) return null
  const prefix = 'Bearer '
  if (!header.startsWith(prefix)) return null
  const token = header.slice(prefix.length).trim()
  return token === '' ? null : token
}

function securelyCompareSecrets(left: string, right: string): boolean {
  const leftHash = Buffer.from(sha256Hex(left), 'hex')
  const rightHash = Buffer.from(sha256Hex(right), 'hex')
  return timingSafeEqual(leftHash, rightHash)
}

import { parseServerEnv } from '~/server/env'

import { jsonApiError } from './server-api-errors'

export function authorizeServerApiRequest(request: Request): Response | null {
  const key = parseServerEnv(process.env).SUBKIT_SERVER_API_KEY
  if (key == null) {
    return jsonApiError({ code: 'service_unavailable', message: 'SubKit server API key is not configured', status: 503 })
  }

  const header = request.headers.get('authorization')
  if (header !== `Bearer ${key}`) {
    return jsonApiError({ code: 'unauthorized', message: 'Unauthorized', status: 401 })
  }

  return null
}

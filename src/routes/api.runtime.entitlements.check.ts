import { createFileRoute } from '@tanstack/react-router'

import { checkRuntimeEntitlement, runtimeEntitlementCheckInputSchema } from '~/server/runtime-api'
import { parseServerEnv } from '~/server/env'

export const Route = createFileRoute('/api/runtime/entitlements/check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeRuntimeReadRequest(request)
        if (authError != null) return authError

        try {
          const payload = runtimeEntitlementCheckInputSchema.parse(await request.json())
          const result = await checkRuntimeEntitlement(payload)
          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Runtime entitlement check failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})

function authorizeRuntimeReadRequest(request: Request): Response | null {
  const key = parseServerEnv(process.env).SUBKIT_RUNTIME_READ_API_KEY
  if (key == null) {
    return Response.json({ error: 'Runtime read API key is not configured' }, { status: 503 })
  }

  const header = request.headers.get('authorization')
  if (header !== `Bearer ${key}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

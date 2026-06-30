import { createFileRoute } from '@tanstack/react-router'

import { importRuntimeSubscribers, runtimeSyncInputSchema } from '~/features/subkit/runtime-sync-server'
import { parseServerEnv } from '~/server/env'

export const Route = createFileRoute('/api/runtime/subscribers')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeRuntimeRequest(request)
        if (authError != null) return authError

        try {
          const payload = runtimeSyncInputSchema.parse(await request.json())
          const result = await importRuntimeSubscribers(payload.appId, payload.subscribers, payload.source ?? 'runtime-api')
          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Runtime subscriber sync failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})

function authorizeRuntimeRequest(request: Request): Response | null {
  const key = parseServerEnv(process.env).SUBKIT_RUNTIME_API_KEY
  if (key == null) {
    return Response.json({ error: 'Runtime sync API key is not configured' }, { status: 503 })
  }

  const header = request.headers.get('authorization')
  if (header !== `Bearer ${key}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

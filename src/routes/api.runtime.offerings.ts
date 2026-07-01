import { runtimeOfferingsRequestSchema } from '@piparotech/subkit-core'
import { createFileRoute } from '@tanstack/react-router'

import { authorizeRuntimeRequest, listRuntimeOfferings } from '~/server/runtime-api'

export const Route = createFileRoute('/api/runtime/offerings')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeRuntimeRequest(request)
        if (authError != null) return authError

        try {
          const payload = runtimeOfferingsRequestSchema.parse(await request.json())
          const result = await listRuntimeOfferings(payload)
          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Runtime offerings failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})

import { runtimeOfferingsRequestSchema } from '@piparotech/subkit-core'
import { createFileRoute } from '@tanstack/react-router'

import { authorizeRuntimeRequest, listRuntimeOfferings } from '~/server/runtime-api'
import { jsonApiError, jsonApiErrorFromThrown } from '~/server/runtime-api/errors'

export const Route = createFileRoute('/api/runtime/offerings')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeRuntimeRequest(request)
        if (!auth.ok) return auth.response

        try {
          const parsed = runtimeOfferingsRequestSchema.safeParse(await request.json().catch(() => null))
          if (!parsed.success) {
            return jsonApiError({ code: 'invalid_request', details: parsed.error.flatten(), message: 'Invalid runtime offerings request', status: 400 })
          }

          const result = await listRuntimeOfferings({ ...parsed.data, appId: auth.appId })
          return Response.json(result)
        } catch (error) {
          return jsonApiErrorFromThrown(error)
        }
      },
    },
  },
})

import { serverOfferingsRequestSchema } from '@piparotech/subkit-core'
import { createFileRoute } from '@tanstack/react-router'

import { authorizeServerApiRequest } from '~/features/subkit/server-api-auth'
import { jsonApiError, jsonApiErrorFromThrown } from '~/features/subkit/server-api-errors'
import { listServerOfferings } from '~/features/subkit/server-offerings'

export const Route = createFileRoute('/api/server/offerings')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeServerApiRequest(request)
        if (authError != null) return authError

        try {
          const payload = serverOfferingsRequestSchema.safeParse(await request.json())
          if (!payload.success) {
            return jsonApiError({ code: 'validation_failed', details: payload.error.issues, message: 'Invalid offerings request', status: 400 })
          }

          const result = await listServerOfferings(payload.data)
          return Response.json(result)
        } catch (error) {
          return jsonApiErrorFromThrown(error)
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { authorizeServerApiRequest } from '~/server/runtime-api'
import { jsonApiError, jsonApiErrorFromThrown } from '~/server/runtime-api'
import { listServerProducts } from '~/server/runtime-api'

import { serverProductsRequestSchema } from '@piparotech/subkit-core'

export const Route = createFileRoute('/api/server/products')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeServerApiRequest(request)
        if (authError != null) return authError

        try {
          const payload = serverProductsRequestSchema.safeParse(await request.json())
          if (!payload.success) {
            return jsonApiError({
              code: 'validation_failed',
              details: payload.error.issues,
              message: 'Invalid products request',
              status: 400,
            })
          }

          const result = await listServerProducts(payload.data)
          return Response.json(result)
        } catch (error) {
          return jsonApiErrorFromThrown(error)
        }
      },
    },
  },
})

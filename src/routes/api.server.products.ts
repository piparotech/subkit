import { serverProductsRequestSchema } from '@piparotech/subkit-core'
import { createFileRoute } from '@tanstack/react-router'

import { authorizeServerApiRequest } from '~/features/subkit/server-api-auth'
import { jsonApiError, jsonApiErrorFromThrown } from '~/features/subkit/server-api-errors'
import { listServerProducts } from '~/features/subkit/server-products'

export const Route = createFileRoute('/api/server/products')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeServerApiRequest(request)
        if (authError != null) return authError

        try {
          const payload = serverProductsRequestSchema.safeParse(await request.json())
          if (!payload.success) {
            return jsonApiError({ code: 'validation_failed', details: payload.error.issues, message: 'Invalid products request', status: 400 })
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

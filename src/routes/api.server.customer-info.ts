import { createFileRoute } from '@tanstack/react-router'

import { authorizeServerApiRequest } from '~/server/runtime-api'
import { jsonApiError, jsonApiErrorFromThrown } from '~/server/runtime-api'
import { getServerCustomerInfo } from '~/server/runtime-api'

import { serverCustomerInfoRequestSchema } from '@piparotech/subkit-core'

export const Route = createFileRoute('/api/server/customer-info')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeServerApiRequest(request)
        if (authError != null) return authError

        try {
          const payload = serverCustomerInfoRequestSchema.safeParse(await request.json())
          if (!payload.success) {
            return jsonApiError({
              code: 'validation_failed',
              details: payload.error.issues,
              message: 'Invalid customer info request',
              status: 400,
            })
          }

          const result = await getServerCustomerInfo(payload.data)
          return Response.json(result)
        } catch (error) {
          return jsonApiErrorFromThrown(error)
        }
      },
    },
  },
})

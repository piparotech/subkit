import { serverCustomerInfoRequestSchema } from '@piparotech/subkit-core'
import { createFileRoute } from '@tanstack/react-router'

import { authorizeServerApiRequest } from '~/features/subkit/server-api-auth'
import { jsonApiError, jsonApiErrorFromThrown } from '~/features/subkit/server-api-errors'
import { getServerCustomerInfo } from '~/features/subkit/server-customer-info'

export const Route = createFileRoute('/api/server/customer-info')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeServerApiRequest(request)
        if (authError != null) return authError

        try {
          const payload = serverCustomerInfoRequestSchema.safeParse(await request.json())
          if (!payload.success) {
            return jsonApiError({ code: 'validation_failed', details: payload.error.issues, message: 'Invalid customer info request', status: 400 })
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

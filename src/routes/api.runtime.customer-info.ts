import { createFileRoute } from '@tanstack/react-router'

import { authorizeRuntimeRequest, getRuntimeCustomerInfo } from '~/server/runtime-api'
import { jsonApiError, jsonApiErrorFromThrown } from '~/server/runtime-api/errors'

import { runtimeCustomerInfoRequestSchema } from '@piparotech/subkit-core'

export const Route = createFileRoute('/api/runtime/customer-info')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeRuntimeRequest(request)
        if (!auth.ok) return auth.response

        try {
          const parsed = runtimeCustomerInfoRequestSchema.safeParse(
            await request.json().catch(() => null),
          )
          if (!parsed.success) {
            return jsonApiError({
              code: 'invalid_request',
              details: parsed.error.flatten(),
              message: 'Invalid runtime customer info request',
              status: 400,
            })
          }

          const result = await getRuntimeCustomerInfo({ ...parsed.data, appId: auth.appId })
          return Response.json(result)
        } catch (error) {
          return jsonApiErrorFromThrown(error)
        }
      },
    },
  },
})

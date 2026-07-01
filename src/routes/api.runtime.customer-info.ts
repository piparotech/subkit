import { runtimeCustomerInfoRequestSchema } from '@piparotech/subkit-core'
import { createFileRoute } from '@tanstack/react-router'

import { authorizeRuntimeRequest, getRuntimeCustomerInfo } from '~/server/runtime-api/runtime'

export const Route = createFileRoute('/api/runtime/customer-info')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeRuntimeRequest(request)
        if (authError != null) return authError

        try {
          const payload = runtimeCustomerInfoRequestSchema.parse(await request.json())
          const result = await getRuntimeCustomerInfo(payload)
          return Response.json(result)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Runtime customer info failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { authorizeRuntimeRequest, checkRuntimeEntitlement } from '~/server/runtime-api'
import { jsonApiError, jsonApiErrorFromThrown } from '~/server/runtime-api/errors'

import { runtimeEntitlementCheckRequestSchema } from '@piparotech/subkit-core'

export const Route = createFileRoute('/api/runtime/entitlements/check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeRuntimeRequest(request)
        if (!auth.ok) return auth.response

        try {
          const parsed = runtimeEntitlementCheckRequestSchema.safeParse(
            await request.json().catch(() => null),
          )
          if (!parsed.success) {
            return jsonApiError({
              code: 'invalid_request',
              details: parsed.error.flatten(),
              message: 'Invalid runtime entitlement check request',
              status: 400,
            })
          }

          const result = await checkRuntimeEntitlement({ ...parsed.data, appId: auth.appId })
          return Response.json(result)
        } catch (error) {
          return jsonApiErrorFromThrown(error)
        }
      },
    },
  },
})

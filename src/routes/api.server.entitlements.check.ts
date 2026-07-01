import { serverEntitlementCheckRequestSchema } from '@piparotech/subkit-core'
import { createFileRoute } from '@tanstack/react-router'

import { authorizeServerApiRequest } from '~/features/subkit/server-api-auth'
import { jsonApiError, jsonApiErrorFromThrown } from '~/features/subkit/server-api-errors'
import { checkRuntimeEntitlement } from '~/features/subkit/runtime-entitlements-server'

export const Route = createFileRoute('/api/server/entitlements/check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeServerApiRequest(request)
        if (authError != null) return authError

        try {
          const payload = serverEntitlementCheckRequestSchema.safeParse(await request.json())
          if (!payload.success) {
            return jsonApiError({ code: 'validation_failed', details: payload.error.issues, message: 'Invalid entitlement check request', status: 400 })
          }

          const result = await checkRuntimeEntitlement(payload.data)
          return Response.json(result)
        } catch (error) {
          return jsonApiErrorFromThrown(error)
        }
      },
    },
  },
})

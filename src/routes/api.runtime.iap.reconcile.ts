import { createFileRoute } from '@tanstack/react-router'

import { authorizeRuntimeRequest, reconcileRuntimeIap } from '~/server/runtime-api'
import { jsonApiError, jsonApiErrorFromThrown } from '~/server/runtime-api/errors'

import { iapReconcileRequestSchema } from '@piparotech/subkit-core'

export const Route = createFileRoute('/api/runtime/iap/reconcile')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authorizeRuntimeRequest(request)
        if (!auth.ok) return auth.response

        try {
          const parsed = iapReconcileRequestSchema.safeParse(await request.json().catch(() => null))
          if (!parsed.success) {
            return jsonApiError({
              code: 'invalid_request',
              details: parsed.error.flatten(),
              message: 'Invalid runtime IAP reconcile request',
              status: 400,
            })
          }

          const result = await reconcileRuntimeIap({ ...parsed.data, appId: auth.appId })
          const status = result.conflicts.length > 0 ? 409 : 200
          return Response.json(result, { status })
        } catch (error) {
          return jsonApiErrorFromThrown(error)
        }
      },
    },
  },
})

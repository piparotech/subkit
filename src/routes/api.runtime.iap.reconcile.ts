import { iapReconcileRequestSchema } from '@piparotech/subkit-core'
import { createFileRoute } from '@tanstack/react-router'

import { authorizeRuntimeRequest, reconcileRuntimeIap } from '~/server/runtime-api'

export const Route = createFileRoute('/api/runtime/iap/reconcile')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeRuntimeRequest(request)
        if (authError != null) return authError

        try {
          const payload = iapReconcileRequestSchema.parse(await request.json())
          const result = await reconcileRuntimeIap(payload)
          const status = result.conflicts.length > 0 ? 409 : 200
          return Response.json(result, { status })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Runtime IAP reconcile failed'
          return Response.json({ error: message }, { status: 400 })
        }
      },
    },
  },
})

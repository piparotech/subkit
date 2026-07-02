import { serverCreateRuntimeSdkKeyRequestSchema } from '@piparotech/subkit-core'
import { createFileRoute } from '@tanstack/react-router'

import { authorizeServerApiRequest, createRuntimeSdkKey, jsonApiError, jsonApiErrorFromThrown } from '~/server/runtime-api'

export const Route = createFileRoute('/api/server/runtime-sdk-keys')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authError = authorizeServerApiRequest(request)
        if (authError != null) return authError

        try {
          const payload = serverCreateRuntimeSdkKeyRequestSchema.safeParse(await request.json())
          if (!payload.success) {
            return jsonApiError({ code: 'validation_failed', details: payload.error.issues, message: 'Invalid runtime SDK key request', status: 400 })
          }

          const result = await createRuntimeSdkKey(payload.data)
          return Response.json(result, { status: 201 })
        } catch (error) {
          return jsonApiErrorFromThrown(error)
        }
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'

import { redirectResponse } from '~/server/auth/http'
import { clearAuthCookies } from '~/server/auth/session'

export const Route = createFileRoute('/logout')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await clearAuthCookies()
        return redirectResponse(new URL('/login?reason=logged_out', request.url))
      },
    },
  },
})

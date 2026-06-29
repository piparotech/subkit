import { createFileRoute } from '@tanstack/react-router'

import { clearAuthCookies } from '~/server/auth/session'

export const Route = createFileRoute('/logout')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await clearAuthCookies()
        return Response.redirect(new URL('/login?reason=logged_out', request.url), 302)
      },
    },
  },
})

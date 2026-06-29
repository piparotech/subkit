import { createFileRoute } from '@tanstack/react-router'

import { ensureDatabaseReady } from '~/db/setup'
import { findOrCreateUserFromClaims } from '~/server/auth/current-user'
import { exchangeCodeForClaims } from '~/server/auth/oidc'
import { clearAuthCookies, getLoginChallengeSession, setAuthenticatedSession } from '~/server/auth/session'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const code = url.searchParams.get('code')
        const state = url.searchParams.get('state')
        const error = url.searchParams.get('error')
        const challengeSession = await getLoginChallengeSession()
        const challenge = challengeSession.data

        if (error) {
          await clearAuthCookies()
          return redirectToLogin(url.origin, 'oidc_error')
        }

        if (!code || !state || state !== challenge.state) {
          await clearAuthCookies()
          return redirectToLogin(url.origin, 'invalid_state')
        }

        if (!challenge.codeVerifier || !challenge.nonce || !challenge.method || !challenge.returnTo) {
          await clearAuthCookies()
          return redirectToLogin(url.origin, 'expired')
        }

        try {
          await ensureDatabaseReady()
          const claims = await exchangeCodeForClaims({
            code,
            codeVerifier: challenge.codeVerifier,
            expectedNonce: challenge.nonce,
          })
          const user = await findOrCreateUserFromClaims(claims, challenge.method)

          await setAuthenticatedSession(user.id)
          await challengeSession.clear()

          return Response.redirect(new URL(challenge.returnTo, url.origin), 302)
        } catch (authError) {
          console.error('OIDC callback failed', authError)
          await clearAuthCookies()
          return redirectToLogin(url.origin, 'callback_failed')
        }
      },
    },
  },
})

function redirectToLogin(origin: string, reason: string): Response {
  const url = new URL('/login', origin)
  url.searchParams.set('reason', reason)
  return Response.redirect(url, 302)
}

import { createFileRoute } from '@tanstack/react-router'

import { createCodeVerifier, createRandomToken } from '~/server/auth/crypto'
import { redirectResponse } from '~/server/auth/http'
import { buildAuthorizeUrl } from '~/server/auth/oidc'
import { getLoginChallengeSession } from '~/server/auth/session'
import type { AuthMethod } from '~/server/auth/types'

export const Route = createFileRoute('/auth/start')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const method = readAuthMethod(url.searchParams.get('method'))
        if (method == null) return new Response('Invalid auth method', { status: 400 })

        const loginHint = readOptionalValue(url.searchParams.get('login_hint'))
        const returnTo = readReturnTo(url.searchParams.get('returnTo'))
        const state = createRandomToken(24)
        const nonce = createRandomToken(24)
        const codeVerifier = createCodeVerifier()
        const challengeSession = await getLoginChallengeSession()

        await challengeSession.update({
          codeVerifier,
          createdAt: Date.now(),
          method,
          nonce,
          returnTo,
          state,
        })

        const authorizeUrl = await buildAuthorizeUrl({
          codeVerifier,
          loginHint,
          method,
          nonce,
          state,
        })
        return redirectResponse(authorizeUrl)
      },
    },
  },
})

function readAuthMethod(value: string | null): AuthMethod | undefined {
  if (value === 'email' || value === 'microsoft') return value
  return undefined
}

function readOptionalValue(value: string | null): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

function readReturnTo(value: string | null): string {
  if (!value?.startsWith('/')) return '/'
  if (value.startsWith('/auth/') || value.startsWith('/login') || value.startsWith('/logout'))
    return '/'
  return value
}

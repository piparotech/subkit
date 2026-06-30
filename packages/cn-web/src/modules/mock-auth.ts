// In-memory seam for the auth-kit Engine: a deterministic mock `fetch` standing in for the platform's
// `/auth/*` backend, plus a tiny store factory. The Engine is injected with this fetch, so the real
// client/session controller runs unchanged — single-flight refresh, Bearer attach, the 401 retry — with
// no network and no database. Seeded creds mirror the native auth mock so both showcases tell the same
// story: demo@piparo.tech / password123.
import { type AuthTokenStore, createMemoryStore } from '@/lib/auth'

export const SEEDED_EMAIL = 'demo@piparo.tech'
export const SEEDED_PASSWORD = 'password123'
export const SEEDED_USER_ID = 'user:demo-1'
export const SEEDED_DISPLAY_NAME = 'Demo Operator'

/** The injected backend base the Engine prefixes its `/auth/*` paths with (never actually reached). */
export const MOCK_BASE_URL = 'https://api.piparo.local'

const ACCESS_TTL_SEC = 15 * 60
const REFRESH_TTL_SEC = 30 * 24 * 60 * 60

/** base64url without padding, the JWT segment encoding (browser `btoa` over a UTF-8-safe string). */
function base64url(json: object): string {
  return btoa(JSON.stringify(json)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** A real-shaped HS256 JWT with a fixed signature segment — the Engine only decodes `sub`/`exp`. */
function issueJwt(claims: { sub: string; ttlSec: number; sid?: string }): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' })
  const nowSec = Math.floor(Date.now() / 1000)
  const payload = base64url({
    sub: claims.sub,
    ...(claims.sid ? { sid: claims.sid } : {}),
    iat: nowSec,
    exp: nowSec + claims.ttlSec,
  })
  return `${header}.${payload}.${base64url({ mock: true })}`
}

type JsonBody = Record<string, unknown>

function json(status: number, body: JsonBody): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function issueTokens() {
  return {
    access_token: issueJwt({ sub: SEEDED_USER_ID, ttlSec: ACCESS_TTL_SEC }),
    refresh_token: issueJwt({ sub: SEEDED_USER_ID, sid: 'session-1', ttlSec: REFRESH_TTL_SEC }),
  }
}

/**
 * A stateful in-memory `fetch` for the seeded `/auth/*` routes. It rejects unknown credentials with the
 * Engine's `INVALID_CREDENTIALS` code, mints JWT-shaped tokens on login, resolves the canonical identity
 * from a Bearer access token on `/auth/userinfo`, and revokes on logout — modelling the server the
 * audited client expects, end to end.
 */
export function createMockAuthFetch(): typeof fetch {
  let revoked = false

  return async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString()
    const path = url.replace(MOCK_BASE_URL, '')
    const headers = new Headers(init?.headers)

    if (path === '/auth/token') {
      const { email, password } = JSON.parse(String(init?.body ?? '{}')) as {
        email?: string
        password?: string
      }
      if (email !== SEEDED_EMAIL || password !== SEEDED_PASSWORD) {
        return json(401, { code: 'INVALID_CREDENTIALS' })
      }
      revoked = false
      return json(200, issueTokens())
    }

    if (path === '/auth/userinfo') {
      const bearer = headers.get('authorization')?.replace(/^Bearer\s+/i, '')
      if (revoked || !bearer) return json(401, { code: 'UNAUTHENTICATED' })
      return json(200, { userId: SEEDED_USER_ID })
    }

    if (path === '/auth/refresh') {
      if (revoked) return json(401, { code: 'TOKEN_REVOKED' })
      return json(200, issueTokens())
    }

    if (path === '/auth/logout') {
      revoked = true
      return json(200, {})
    }

    return json(404, { code: 'NOT_FOUND' })
  }
}

/** Fresh, isolated store per demo mount so reloads start signed out. */
export function createMockAuthStore(): AuthTokenStore {
  return createMemoryStore()
}

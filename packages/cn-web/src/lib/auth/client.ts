import type { AuthTokenStore } from './store'

export type SessionState =
  // `userId` is decoded from the UNVERIFIED access-token payload for display only — never use it as a
  // security boundary (authz, tenant scoping, cross-trust cache keys). The only trustworthy identity
  // is what the backend returns from `userInfo()` (server-verified).
  { status: 'authenticated'; userId: string } | { status: 'unauthenticated' }

export type AuthClientOptions = {
  /** Backend origin, e.g. `https://api.example.com` (the `/auth` prefix is added by the client). */
  baseUrl: string
  store: AuthTokenStore
  /** Override for tests / RN polyfills. Defaults to global fetch. */
  fetch?: typeof fetch
  /** `'include'` for web httpOnly-cookie refresh mode; omit on native. */
  credentials?: RequestCredentials
  onSessionChange?: (state: SessionState) => void
}

export type AuthResult = { ok: true } | { ok: false; code: string }

type TokenBody = { access_token?: string; refresh_token?: string }

const ok: AuthResult = { ok: true }

/**
 * Framework-agnostic auth client (web + native). Wraps the own-password `/auth/*` routes, persists
 * tokens via the injected store, attaches Bearer access tokens, and refreshes **single-flight** on
 * 401 — concurrent refreshes with the same single-use refresh token would otherwise trip the
 * backend's reuse-detection and revoke the whole family.
 */
export function createAuthClient(opts: AuthClientOptions) {
  const baseUrl = opts.baseUrl.replace(/\/+$/, '')
  const { store } = opts
  const doFetch = opts.fetch ?? globalThis.fetch
  const { credentials } = opts
  const emit = opts.onSessionChange ?? (() => {})
  let refreshing: Promise<string | null> | null = null

  const url = (path: string) => `${baseUrl}${path}`

  function post(path: string, body: unknown): Promise<Response> {
    return doFetch(url(path), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      ...(credentials ? { credentials } : {}),
      body: JSON.stringify(body),
    })
  }

  function withAuth(init: RequestInit, access: string | null): RequestInit {
    const headers = new Headers(init.headers)
    if (access) headers.set('authorization', `Bearer ${access}`)
    return { ...init, headers, ...(credentials ? { credentials } : {}) }
  }

  async function errorCode(res: Response): Promise<string> {
    try {
      const data = (await res.json()) as { code?: string }
      return data.code ?? `HTTP_${res.status}`
    } catch {
      return `HTTP_${res.status}`
    }
  }

  /** Persist tokens from a token response; returns the new access token (or null). */
  async function persist(res: Response): Promise<string | null> {
    const data = (await res.json()) as TokenBody
    const accessToken = data.access_token ?? null
    const refreshToken = data.refresh_token ?? null
    await store.save({ accessToken, refreshToken })
    return accessToken
  }

  /** Single-flight refresh: a concurrent caller awaits the in-flight attempt instead of racing it. */
  function refresh(): Promise<string | null> {
    if (refreshing) return refreshing
    refreshing = (async () => {
      try {
        const refreshToken = await store.getRefresh()
        // Native must have a refresh token; web cookie mode (credentials) may carry it implicitly.
        if (!refreshToken && !credentials) return null
        const res = await post('/auth/refresh', refreshToken ? { refresh_token: refreshToken } : {})
        if (!res.ok) {
          await store.clear()
          emit({ status: 'unauthenticated' })
          return null
        }
        return await persist(res)
      } catch {
        // Network/parse failure during refresh → treat as a failed refresh, never escape to callers
        // (under single-flight a thrown promise would reject every concurrent authedFetch at once).
        await store.clear()
        emit({ status: 'unauthenticated' })
        return null
      } finally {
        refreshing = null
      }
    })()
    return refreshing
  }

  async function onAuthenticated(access: string | null): Promise<void> {
    // An already-expired access token must never surface a stale identity — treat it as not signed
    // in (a later authedFetch will refresh). Guards the restore/edge path; reuses the exp decoder.
    const live = access && !isExpired(access) ? access : null
    const userId = live ? decodeSub(live) : null
    emit(userId ? { status: 'authenticated', userId } : { status: 'unauthenticated' })
  }

  /** Fetch with Bearer auth; on a single 401, refresh once (single-flight) and retry. */
  async function authedFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
    const access = await store.getAccess()
    const res = await doFetch(input, withAuth(init, access))
    if (res.status !== 401) return res
    const renewed = await refresh()
    if (!renewed) return res
    return doFetch(input, withAuth(init, renewed))
  }

  return {
    /** Register; backend stays neutral (202) → returns ok regardless of account existence. */
    async register(email: string, password: string): Promise<AuthResult> {
      const res = await post('/auth/register', { email, password })
      return res.ok ? ok : { ok: false, code: await errorCode(res) }
    },

    /** Confirm a double-opt-in code → logs in (stores tokens). */
    async confirm(email: string, code: string): Promise<AuthResult> {
      const res = await post('/auth/confirm', { email, code })
      if (!res.ok) return { ok: false, code: await errorCode(res) }
      await onAuthenticated(await persist(res))
      return ok
    },

    /** OAuth2 Password Grant → stores tokens + emits authenticated. */
    async login(email: string, password: string, device?: string): Promise<AuthResult> {
      const res = await post('/auth/token', { email, password, ...(device ? { device } : {}) })
      if (!res.ok) return { ok: false, code: await errorCode(res) }
      await onAuthenticated(await persist(res))
      return ok
    },

    async forgot(email: string): Promise<AuthResult> {
      const res = await post('/auth/forgot', { email })
      return res.ok ? ok : { ok: false, code: await errorCode(res) }
    },

    async reset(email: string, code: string, newPassword: string): Promise<AuthResult> {
      const res = await post('/auth/reset', { email, code, new_password: newPassword })
      return res.ok ? ok : { ok: false, code: await errorCode(res) }
    },

    /** Revoke the refresh family server-side + clear local tokens. Always ends unauthenticated. */
    async logout(): Promise<void> {
      const refreshToken = await store.getRefresh()
      try {
        await post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {})
      } catch {
        // best-effort server revoke; the local clear below is authoritative
      } finally {
        await store.clear()
        emit({ status: 'unauthenticated' })
      }
    },

    /** Current access token, refreshing if absent or (decodably) expired. */
    async getAccessToken(): Promise<string | null> {
      const stored = await store.getAccess()
      if (stored && !isExpired(stored)) return stored
      return refresh()
    },

    refresh,
    authedFetch,

    async userInfo(): Promise<{ userId: string } | null> {
      const res = await authedFetch(url('/auth/userinfo'), { method: 'GET' })
      if (!res.ok) return null
      return (await res.json()) as { userId: string }
    },
  }
}

export type AuthClient = ReturnType<typeof createAuthClient>

/** Best-effort, UNVERIFIED JWT payload decode — local display/expiry hints only, never for trust. */
function decodePayload(jwt: string): Record<string, unknown> | null {
  const part = jwt.split('.')[1]
  if (!part) return null
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function decodeSub(jwt: string): string | null {
  const sub = decodePayload(jwt)?.sub
  return typeof sub === 'string' ? sub : null
}

/** Best-effort `sub` from a token — display-only (UNVERIFIED); the session uses it as an offline
 *  fallback identity when the server `userInfo()` check can't run. */
export function subjectFromToken(jwt: string): string | null {
  return decodeSub(jwt)
}

/** True only if `exp` is decodable AND in the past (with a small clock-skew margin). */
function isExpired(jwt: string, skewMs = 5000): boolean {
  const exp = decodePayload(jwt)?.exp
  return typeof exp === 'number' && exp * 1000 <= Date.now() + skewMs
}

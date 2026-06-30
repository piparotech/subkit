import { type AuthClient, type AuthResult, createAuthClient, subjectFromToken } from './client'
import type { AuthTokenStore } from './store'

/**
 * The token set an OIDC PKCE redirect hands back, established into a session via `applyOidcTokens`.
 * Inlined from the Engine's `oidc` module (the host-side PKCE/redirect machinery is omitted from this
 * showcase, which exercises only the own-password sign-in path).
 */
export type OidcTokenSet = {
  accessToken: string
  idToken: string | null
  refreshToken: string | null
  expiresIn: number | null
}

/**
 * Framework-agnostic session controller — the logic behind the app's `SessionProvider` (the React
 * wrapper is a thin `useSyncExternalStore` over this). Models the seam the app-starter's hull only
 * stubs: `restoring` (async rehydrate on boot) → `authenticated`/`unauthenticated`. Backed by the
 * audited AuthClient; works for both own-password (login mints our tokens) and OIDC (the host runs
 * the PKCE redirect, then hands the token set to `applyOidcTokens`).
 */
export type Session =
  | { status: 'restoring' }
  | { status: 'authenticated'; userId: string }
  | { status: 'unauthenticated' }

export type AuthSession = {
  getSnapshot(): Session
  subscribe(listener: () => void): () => void
  /** Rehydrate from the token store on boot (server-verified, offline-tolerant). */
  restore(): Promise<void>
  signIn(email: string, password: string, device?: string): Promise<AuthResult>
  register(email: string, password: string): Promise<AuthResult>
  confirm(email: string, code: string): Promise<AuthResult>
  forgot(email: string): Promise<AuthResult>
  reset(email: string, code: string, newPassword: string): Promise<AuthResult>
  /** Establish a session from an OIDC token set (after the host's PKCE redirect + handleCallback). */
  applyOidcTokens(tokens: OidcTokenSet): Promise<void>
  signOut(): Promise<void>
  /** The underlying client for authed requests (authedFetch / getAccessToken). */
  client: AuthClient
}

export type AuthSessionOptions = {
  baseUrl: string
  store: AuthTokenStore
  fetch?: typeof fetch
  credentials?: RequestCredentials
}

export function createAuthSession(opts: AuthSessionOptions): AuthSession {
  let session: Session = { status: 'restoring' }
  const listeners = new Set<() => void>()
  const set = (next: Session) => {
    session = next
    for (const listener of listeners) listener()
  }

  const client = createAuthClient({
    baseUrl: opts.baseUrl,
    store: opts.store,
    fetch: opts.fetch,
    credentials: opts.credentials,
    // login/confirm + a failed refresh emit here → reflect into session state.
    onSessionChange: (state) =>
      set(
        state.status === 'authenticated'
          ? { status: 'authenticated', userId: state.userId }
          : { status: 'unauthenticated' },
      ),
  })

  async function establishFromStore(): Promise<void> {
    const token = await client.getAccessToken()
    if (!token) return set({ status: 'unauthenticated' })
    try {
      const info = await client.userInfo() // server-verified canonical identity (password + oidc)
      set(info ? { status: 'authenticated', userId: info.userId } : { status: 'unauthenticated' })
    } catch {
      // Network error (offline) → trust the local token; userId is display-only.
      const userId = subjectFromToken(token)
      set(userId ? { status: 'authenticated', userId } : { status: 'unauthenticated' })
    }
  }

  return {
    getSnapshot: () => session,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async restore() {
      set({ status: 'restoring' })
      await establishFromStore()
    },
    signIn: (email, password, device) => client.login(email, password, device),
    register: (email, password) => client.register(email, password),
    confirm: (email, code) => client.confirm(email, code),
    forgot: (email) => client.forgot(email),
    reset: (email, code, newPassword) => client.reset(email, code, newPassword),
    async applyOidcTokens(tokens) {
      await opts.store.save({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
      await establishFromStore()
    },
    signOut: () => client.logout(),
    client,
  }
}

// In-memory seam for the auth-session-web Engine: a self-contained SSR "server" that runs the real
// module — verify an upstream bearer at login, mint an HS256 session, hand the browser only opaque
// HttpOnly cookies, guard a protected route server-side, and gate mutations on CSRF — with no network
// and no database. The injected seam is the upstream `verifyUpstream` (the bearer→identity check the
// real backend wires) plus an in-memory session store for stateful revocation. Seeded creds mirror
// the native auth mock so both showcases tell the same story: demo@piparo.tech / password123.
import {
  AuthSessionWebConfig,
  type CookieAttributes,
  type SessionSigner,
  createSessionSigner,
  deleteCookie,
  generateCsrfToken,
  isCsrfValid,
  readCookie,
  serializeCookie,
} from '@/lib/auth-session-web'

export const SEEDED_EMAIL = 'demo@piparo.tech'
export const SEEDED_PASSWORD = 'password123'
const SEEDED_SUBJECT = 'user:demo-1'

/** The same Cockpit-facing config the platform validates, parsed once with the module's defaults. */
export const seededConfig = AuthSessionWebConfig.parse({})

// Demo-only HS256 secret. Real deployments inject a long random server-only secret; never a constant.
const SESSION_SECRET = 'showcase-demo-session-secret-key-0123456789'
const SELF_ORIGIN = 'https://app.piparo.tech'

/** What the browser keeps: opaque cookie strings, exactly as a real browser would after Set-Cookie. */
export type CookieJar = Record<string, string>

// Members carry the cross-branch fields as optional so the demo can read them without relying on
// discriminated-union narrowing, which TS only performs under strictNullChecks (off in cn-web).
export type ServerResult =
  | { ok: true; setCookies: string[]; csrfToken?: string; status?: undefined; reason?: undefined }
  | { ok: false; status: number; reason: string; setCookies?: undefined; csrfToken?: undefined }

export type GuardResult =
  | { authenticated: true; subject: string; redirectTo?: undefined }
  | { authenticated: false; redirectTo: string; subject?: undefined }

/** The injected upstream identity check — the real backend verifies a federated bearer here. */
type UpstreamVerifier = (credentials: { email: string; password: string }) => string | null

const verifyUpstream: UpstreamVerifier = ({ email, password }) =>
  email === SEEDED_EMAIL && password === SEEDED_PASSWORD ? SEEDED_SUBJECT : null

function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

function sessionCookieAttrs(maxAgeSec?: number): CookieAttributes {
  const { sameSite, secure, path, domain } = seededConfig.cookies
  return { httpOnly: true, sameSite, secure: secure ?? true, path, domain, maxAgeSec }
}

/**
 * A deterministic in-memory SSR server backed by the vendored Engine. Each method models one HTTP
 * round trip: it reads the request `Cookie` header, runs the Engine, and returns the `Set-Cookie`
 * strings the browser would store. A server-side session set tracks live sessions so logout can
 * revoke them (stateful), independent of the JWT's own validity (stateless access).
 */
export class InMemoryAuthServer {
  private readonly signer: SessionSigner
  private readonly liveSessions = new Set<string>()

  constructor(signer: SessionSigner = createSessionSigner(SESSION_SECRET)) {
    this.signer = signer
  }

  /** Verify the upstream bearer, mint a session, and emit the HttpOnly session + readable CSRF cookies. */
  async login(email: string, password: string): Promise<ServerResult> {
    const subject = verifyUpstream({ email, password })
    if (!subject) return { ok: false, status: 401, reason: 'INVALID_CREDENTIALS' }

    const sid = crypto.randomUUID()
    this.liveSessions.add(sid)
    const csrfToken = generateCsrfToken()
    const { sessionName, refreshName, csrfName } = seededConfig.cookies
    const { accessMaxAgeSec, refreshMaxAgeSec } = seededConfig.lifetimes

    return {
      ok: true,
      csrfToken,
      setCookies: [
        serializeCookie(
          sessionName,
          await this.signer.signAccess({ sub: subject }, accessMaxAgeSec),
          sessionCookieAttrs(accessMaxAgeSec),
        ),
        serializeCookie(
          refreshName,
          await this.signer.signRefresh({ sub: subject, sid }, refreshMaxAgeSec),
          sessionCookieAttrs(refreshMaxAgeSec),
        ),
        // The CSRF cookie is deliberately readable so the browser can mirror it (double-submit).
        serializeCookie(csrfName, csrfToken, {
          ...sessionCookieAttrs(refreshMaxAgeSec),
          httpOnly: false,
        }),
      ],
    }
  }

  /** The SSR loader guard: read the session cookie, verify it, redirect to login if absent/invalid. */
  async guard(jar: CookieJar): Promise<GuardResult> {
    const token = readCookie(cookieHeader(jar), seededConfig.cookies.sessionName)
    if (token) {
      try {
        const { sub } = await this.signer.verifyAccess(token)
        return { authenticated: true, subject: sub }
      } catch {
        // fall through to redirect
      }
    }
    return { authenticated: false, redirectTo: seededConfig.loginPath }
  }

  /** A mutating action behind the CSRF gate (double-submit token AND same-origin, per `csrf: 'both'`). */
  async mutate(
    jar: CookieJar,
    sentToken: string | undefined,
    origin: string,
  ): Promise<ServerResult> {
    const header = cookieHeader(jar)
    const session = readCookie(header, seededConfig.cookies.sessionName)
    if (!session) return { ok: false, status: 401, reason: 'NO_SESSION' }

    const passed = isCsrfValid({
      mode: seededConfig.csrf,
      cookieToken: readCookie(header, seededConfig.cookies.csrfName),
      sentToken,
      requestOrigin: origin,
      selfOrigin: SELF_ORIGIN,
      trustedOrigins: seededConfig.trustedOrigins,
    })
    return passed
      ? { ok: true, setCookies: [] }
      : { ok: false, status: 403, reason: 'CSRF_REJECTED' }
  }

  /** Revoke the session server-side and return the cookie-deletion `Set-Cookie` headers. */
  async logout(jar: CookieJar): Promise<{ setCookies: string[] }> {
    const refresh = readCookie(cookieHeader(jar), seededConfig.cookies.refreshName)
    if (refresh) {
      try {
        const { sid } = await this.signer.verifyRefresh(refresh)
        this.liveSessions.delete(sid)
      } catch {
        // already invalid — deleting the cookies is still correct
      }
    }
    const { sessionName, refreshName, csrfName } = seededConfig.cookies
    const erase = sessionCookieAttrs()
    return {
      setCookies: [
        deleteCookie(sessionName, erase),
        deleteCookie(refreshName, erase),
        deleteCookie(csrfName, erase),
      ],
    }
  }
}

export const TRUSTED_ORIGIN = SELF_ORIGIN
export const FOREIGN_ORIGIN = 'https://evil.example'

/** Model the browser storing a `Set-Cookie`: keep only `name=value`, drop empty (deleted) cookies. */
export function applySetCookies(jar: CookieJar, setCookies: string[]): CookieJar {
  const next = { ...jar }
  for (const header of setCookies) {
    const [pair] = header.split(';')
    const eq = pair.indexOf('=')
    const name = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    if (value === '') delete next[name]
    else next[name] = value
  }
  return next
}

/** The cookie names a browser exposes to `document.cookie` (everything that is NOT HttpOnly). */
export function scriptVisibleCookies(jar: CookieJar): string[] {
  return Object.keys(jar).filter((name) => name === seededConfig.cookies.csrfName)
}

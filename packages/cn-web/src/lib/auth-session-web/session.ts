import { type JWTPayload, SignJWT, jwtVerify } from 'jose'

/**
 * Server-side session token (de)serialisation. The session is a short-lived signed JWT carried in an
 * HttpOnly cookie — the browser only ever sees an opaque, JS-unreadable string. We MINT this internal
 * session token after VERIFYING an upstream identity bearer (the backend injects the verifier); the
 * session token is HS256 over a server-only secret and never leaves the server except inside the
 * HttpOnly cookie.
 *
 * The refresh token additionally carries a `sid` (server-side session id) so logout can invalidate
 * the session row, making the long-lived refresh useless even though the JWT itself is still
 * cryptographically valid (stateless access + stateful revocation).
 */

export type SessionClaims = {
  /** The verified upstream subject (identity). Rows/sessions are keyed by this — no IDOR. */
  sub: string
  /** Server-side session id (for the refresh token / revocation). */
  sid?: string
}

const ACCESS_TYP = 'session'
const REFRESH_TYP = 'refresh'

export type SessionSigner = {
  signAccess(claims: SessionClaims, maxAgeSec: number): Promise<string>
  signRefresh(claims: Required<SessionClaims>, maxAgeSec: number): Promise<string>
  verifyAccess(token: string): Promise<SessionClaims>
  verifyRefresh(token: string): Promise<Required<SessionClaims>>
}

/**
 * Build an HS256 session signer/verifier over a server-only secret. The secret must be long and
 * random (>= 32 bytes recommended); it is the only thing standing between an attacker and a forged
 * session, so it is never sent to the client and never logged.
 */
export function createSessionSigner(secret: string): SessionSigner {
  if (secret.length < 32) {
    throw new Error('session secret must be at least 32 characters')
  }
  const key = new TextEncoder().encode(secret)

  async function verify(token: string, expectedTyp: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      requiredClaims: ['exp', 'iat', 'sub'],
    })
    if (payload.typ !== expectedTyp) {
      throw new Error('wrong token type')
    }
    return payload
  }

  return {
    async signAccess(claims, maxAgeSec) {
      return new SignJWT({ typ: ACCESS_TYP })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(claims.sub)
        .setIssuedAt()
        .setExpirationTime(`${maxAgeSec}s`)
        .sign(key)
    },
    async signRefresh(claims, maxAgeSec) {
      return new SignJWT({ typ: REFRESH_TYP, sid: claims.sid })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(claims.sub)
        .setIssuedAt()
        .setExpirationTime(`${maxAgeSec}s`)
        .sign(key)
    },
    async verifyAccess(token) {
      const payload = await verify(token, ACCESS_TYP)
      return { sub: payload.sub as string }
    },
    async verifyRefresh(token) {
      const payload = await verify(token, REFRESH_TYP)
      if (typeof payload.sid !== 'string') {
        throw new Error('refresh token missing sid')
      }
      return { sub: payload.sub as string, sid: payload.sid }
    },
  }
}

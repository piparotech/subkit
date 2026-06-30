import type { CsrfMode } from './config'

/**
 * Pure CSRF primitives — double-submit token generation + constant-time comparison, plus an
 * Origin/Referer allow-list check. No I/O. The backend wires these per `CsrfMode`.
 */

/** Generate a high-entropy, URL/cookie-safe CSRF token (hex). Uses the platform WebCrypto. */
export function generateCsrfToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

/**
 * Constant-time string comparison (length-independent) — avoids leaking the token via timing. Both
 * inputs are hashed to a fixed-width buffer first so the comparison time does not depend on length.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let diff = ab.length ^ bb.length
  const max = Math.max(ab.length, bb.length)
  for (let i = 0; i < max; i++) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  }
  return diff === 0
}

/** Verify a double-submit token: the value sent in the header/field must equal the one in the cookie. */
export function verifyDoubleSubmit(
  cookieToken: string | undefined,
  sentToken: string | undefined,
): boolean {
  if (!cookieToken || !sentToken) return false
  return timingSafeEqual(cookieToken, sentToken)
}

/**
 * Verify the request originates from an allowed origin. `requestOrigin` is the `Origin` header (or a
 * value derived from `Referer`). It must match the request's own host (same-origin) or one of the
 * configured `trustedOrigins`. A missing origin on a mutating request fails closed.
 */
export function verifyOrigin(
  requestOrigin: string | undefined,
  selfOrigin: string,
  trustedOrigins: readonly string[] = [],
): boolean {
  if (!requestOrigin) return false
  if (requestOrigin === selfOrigin) return true
  return trustedOrigins.includes(requestOrigin)
}

export type CsrfCheckInput = {
  mode: CsrfMode
  cookieToken: string | undefined
  sentToken: string | undefined
  requestOrigin: string | undefined
  selfOrigin: string
  trustedOrigins?: readonly string[]
}

/** Combined CSRF gate per the configured mode. Returns true only if every required check passes. */
export function isCsrfValid(input: CsrfCheckInput): boolean {
  const tokenOk = verifyDoubleSubmit(input.cookieToken, input.sentToken)
  const originOk = verifyOrigin(input.requestOrigin, input.selfOrigin, input.trustedOrigins)
  switch (input.mode) {
    case 'double-submit':
      return tokenOk
    case 'origin-check':
      return originOk
    case 'both':
      return tokenOk && originOk
  }
}

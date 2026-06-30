import type { SameSite } from './config'

/**
 * Pure, isomorphic cookie (de)serialisation for the web session. No framework, no I/O — it turns a
 * spec into a `Set-Cookie` string and parses a `Cookie` header. The HttpOnly flag is ALWAYS emitted
 * for the session/refresh cookies (the module's reason to exist); the CSRF cookie is deliberately
 * readable so JS can mirror it (double-submit).
 */
export type CookieAttributes = {
  httpOnly: boolean
  sameSite: SameSite
  secure: boolean
  path: string
  domain?: string
  /** Lifetime in seconds. `0` deletes the cookie (expires in the past); omit for a session cookie. */
  maxAgeSec?: number
}

const SAME_SITE_LABEL: Record<SameSite, string> = {
  strict: 'Strict',
  lax: 'Lax',
  none: 'None',
}

// A cookie name must be a token (RFC 6265): no control chars, spaces, or separators.
// eslint-disable-next-line no-control-regex
const INVALID_NAME = /[\x00-\x20\x7f()<>@,;:\\"/[\]?={}]/
// A cookie value must not contain control chars, whitespace, quotes, comma, semicolon or backslash.
// eslint-disable-next-line no-control-regex
const INVALID_VALUE = /[\x00-\x20\x7f",;\\]/

function assertCookieName(name: string): void {
  if (name.length === 0 || INVALID_NAME.test(name)) {
    throw new Error('invalid cookie name')
  }
}

function assertCookieValue(value: string): void {
  if (INVALID_VALUE.test(value)) {
    throw new Error('invalid cookie value')
  }
}

/** Serialise a single cookie into a `Set-Cookie` header value. */
export function serializeCookie(name: string, value: string, attrs: CookieAttributes): string {
  assertCookieName(name)
  assertCookieValue(value)
  const parts = [
    `${name}=${value}`,
    `Path=${attrs.path}`,
    `SameSite=${SAME_SITE_LABEL[attrs.sameSite]}`,
  ]
  if (attrs.domain) parts.push(`Domain=${attrs.domain}`)
  if (attrs.httpOnly) parts.push('HttpOnly')
  if (attrs.secure) parts.push('Secure')
  // SameSite=None is meaningless (and rejected by browsers) without Secure — guard the combination.
  if (attrs.sameSite === 'none' && !attrs.secure) {
    throw new Error('SameSite=None requires Secure')
  }
  if (attrs.maxAgeSec !== undefined) {
    parts.push(`Max-Age=${attrs.maxAgeSec}`)
    const expires = new Date(Date.now() + attrs.maxAgeSec * 1000)
    parts.push(`Expires=${expires.toUTCString()}`)
  }
  return parts.join('; ')
}

/** Build the `Set-Cookie` value that DELETES a cookie (empty value, expired). */
export function deleteCookie(
  name: string,
  attrs: Pick<CookieAttributes, 'path' | 'domain' | 'sameSite' | 'secure'>,
): string {
  return serializeCookie(name, '', {
    httpOnly: true,
    sameSite: attrs.sameSite,
    secure: attrs.secure,
    path: attrs.path,
    domain: attrs.domain,
    maxAgeSec: 0,
  })
}

/** Parse a request `Cookie` header into a name→value map. Tolerant of stray whitespace; later
 *  duplicates win. Returns an empty object for a missing/blank header. */
export function parseCookieHeader(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    const name = pair.slice(0, eq).trim()
    if (name.length === 0) continue
    out[name] = pair.slice(eq + 1).trim()
  }
  return out
}

/** Read one cookie from a request `Cookie` header. */
export function readCookie(header: string | undefined | null, name: string): string | undefined {
  return parseCookieHeader(header)[name]
}

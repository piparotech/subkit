import { z } from 'zod'

/**
 * The `auth-session-web` module's `config.schema` — the contract for `modules[].config` in a
 * Blueprint. It is the typed, customer/cockpit-facing switch surface for the web SSR session: cookie
 * naming + hardening, session/refresh lifetimes, the CSRF strategy and the login route the loader
 * guard redirects to. Validated by generator-core.
 *
 * The module VERIFIES an upstream bearer at login (injected `TokenVerifier`, never mints it) and then
 * holds the session server-side, exposing only an HttpOnly cookie to the browser — the web pendant to
 * the MMKV-token mobile `auth-core`.
 */

/** `SameSite` attribute for the session cookie. `strict` is the safe default for a first-party SSR
 *  app (the cookie is never sent on cross-site navigations, neutralising most CSRF on its own). */
export const SameSite = z.enum(['strict', 'lax', 'none'])
export type SameSite = z.infer<typeof SameSite>

/**
 * How mutating requests are protected against CSRF:
 * - `double-submit` — a non-HttpOnly CSRF cookie is mirrored into a header/field and compared
 *   (works even behind `SameSite=lax`/`none`, e.g. cross-subdomain).
 * - `origin-check` — rely on `SameSite=strict` + an `Origin`/`Referer` allow-list only.
 * - `both` — defence in depth (token AND origin must pass).
 */
export const CsrfMode = z.enum(['double-submit', 'origin-check', 'both'])
export type CsrfMode = z.infer<typeof CsrfMode>

/** Cookie hardening attributes. `secure`/`domain` are environment-dependent (often off in local dev),
 *  so they are configurable; `httpOnly` is NOT configurable — the whole point of the module. */
export const CookieOptions = z.strictObject({
  /** Cookie name for the session (access) token. */
  sessionName: z.string().min(1).default('__Host-sid'),
  /** Cookie name for the refresh token (longer-lived, scoped to the refresh path). */
  refreshName: z.string().min(1).default('__Host-rid'),
  /** Cookie name for the readable CSRF token (double-submit). Not HttpOnly by design. */
  csrfName: z.string().min(1).default('csrf'),
  sameSite: SameSite.default('strict'),
  /** Emit `Secure`. Leave unset to derive from NODE_ENV at runtime (prod → true). */
  secure: z.boolean().optional(),
  /** Cookie `Domain`. Unset → host-only (recommended; required for the `__Host-` prefix). */
  domain: z.string().optional(),
  /** Cookie `Path`. `__Host-` cookies require `/`. */
  path: z.string().default('/'),
})
export type CookieOptions = z.infer<typeof CookieOptions>

export const SessionLifetimes = z.strictObject({
  /** Access-session max-age in seconds (short — the protected route trusts this without a DB read). */
  accessMaxAgeSec: z
    .number()
    .int()
    .positive()
    .default(15 * 60),
  /** Refresh-session max-age in seconds (long — backed by a server-side row that logout revokes). */
  refreshMaxAgeSec: z
    .number()
    .int()
    .positive()
    .default(30 * 24 * 60 * 60),
})
export type SessionLifetimes = z.infer<typeof SessionLifetimes>

export const AuthSessionWebConfig = z.strictObject({
  cookies: CookieOptions.default(() => CookieOptions.parse({})),
  lifetimes: SessionLifetimes.default(() => SessionLifetimes.parse({})),
  csrf: CsrfMode.default('both'),
  /** Where the SSR loader guard redirects an unauthenticated request before any protected HTML. */
  loginPath: z.string().min(1).default('/login'),
  /** Allowed `Origin` values for mutating requests (origin-check / both). Empty = same-origin only,
   *  derived from the request host at runtime. */
  trustedOrigins: z.array(z.string()).default([]),
})
export type AuthSessionWebConfig = z.infer<typeof AuthSessionWebConfig>

/**
 * Rights model ("wer darf bedienen") — per config path: `customer` = editable in the Cockpit,
 * `piparo` = piparo-only. Security-critical knobs (cookie hardening, CSRF strategy, lifetimes) are
 * piparo-only; the user-visible login route is customer-editable.
 */
export type EditableBy = 'piparo' | 'customer'
export const authConfigRights: Record<string, EditableBy> = {
  cookies: 'piparo',
  lifetimes: 'piparo',
  csrf: 'piparo',
  trustedOrigins: 'piparo',
  loginPath: 'customer',
}

/** Parse + validate an auth-session-web module config (returns the Zod safeParse result). */
export function parseAuthSessionWebConfig(input: unknown) {
  return AuthSessionWebConfig.safeParse(input)
}

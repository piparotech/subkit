// @piparo/auth-session-web — the pure, isomorphic Engine of the server-held HttpOnly-cookie web/SSR
// session module (config + cookies + CSRF + session token). The web pendant to the mobile,
// MMKV-token `auth-core`: the browser only ever sees an opaque HttpOnly cookie, protected SSR routes
// are guarded server-side in the loader, mutating requests are CSRF-protected. The Engine VERIFIES an
// injected upstream bearer and mints its OWN server session — it never mints the upstream identity.
// Vendored from piparo-platform/modules/auth-session-web/src (backend/ + RN app/ + tests skipped).
export * from './config'
export * from './cookies'
export * from './csrf'
export * from './session'

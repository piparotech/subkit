// @piparo/auth-kit — the framework-agnostic auth Engine (own-password client + session controller +
// injected token storage) plus its thin React SessionProvider/useSession binding. Vendored from
// piparo-platform/packages/auth-kit/src (server/ + RN app/ + tests skipped); the OIDC PKCE/redirect
// machinery is omitted here (this showcase exercises only the own-password sign-in path). The browser
// drives `createAuthSession` with an in-memory store and a mock fetch — no network, no backend.
export * from './store'
export * from './client'
export * from './session'
export * from './react'
export * from './texts'

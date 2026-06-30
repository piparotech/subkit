// roles-permissions Engine (vendored from @piparo/roles-permissions, src/ only).
// The isomorphic RBAC core: one role -> permission matrix is the single authorization source of
// truth, decided by `can()` identically on the client UI gate and the server guard. Role
// assignments are keyed by the verified auth subject and read fresh, so an admin's grant/revoke
// applies on the next request without re-login. Pure: only depends on zod, no server or RN code.
export * from './rbac'
export * from './config'
export * from './client'

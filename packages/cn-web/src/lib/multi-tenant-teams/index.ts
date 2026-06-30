// multi-tenant-teams Engine (vendored from @piparo/multi-tenant-teams, src/ only).
// The isomorphic tenant-scoping core: a user can be a member of many teams and holds a SEPARATE role
// per team. Tenant isolation is explicit in every query — access to a team's data is only ever
// expressed through a `TenantScope` resolved from the verified auth subject + the caller's
// memberships, so a query can never return team-foreign rows (no DB row-level-security needed).
// Pure: depends only on zod, no server or RN code.
export * from './tenant'
export * from './config'
export * from './client'

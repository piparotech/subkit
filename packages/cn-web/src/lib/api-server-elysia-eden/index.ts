// api-server-elysia-eden — vendored Engine surface for the web showcase. Re-exports the config
// schema, the shared resource contract (Zod mirrors + error codes + status table), the pure domain
// core, and the isomorphic client surface. The backend Elysia app (typed routes + OpenAPI + error
// mapping) lives on the platform; here an in-memory seam stands in for it (see mock-*).
export * from './config'
export * from './contract'
export * from './notes'
export * from './client'

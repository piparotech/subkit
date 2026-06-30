// Vendored Engine for the `profile-basic` module (capability profile-basic; 1:1 module).
// Pure + isomorphic: the shared zod schema, the typed config contract, and the fetch-based client.
// Auth-module-agnostic: the profile row is keyed by the verified `auth_subject`. The cn-web Shell
// lives in the Storybook story; backend/ and the RN app/ are intentionally not vendored.
export * from './config'
export * from './profile'
export * from './client'

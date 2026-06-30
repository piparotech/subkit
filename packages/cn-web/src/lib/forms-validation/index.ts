// @piparo/forms-validation — shared-schema form validation (capability forms-validation; 1:1 module).
// One Zod schema validated on the client (inline UX) AND on the server (authoritative re-check), plus
// a server-side attempt limiter for lockout after N failed tries. Pure TypeScript + zod, no host, no
// server/RN/DOM dependency — so the same code runs in the loader, the server action and in tests.
//
// Vendored into the web showcase from piparo-platform/modules/forms-validation/src. The RN `useForm`
// hook and `TextField` from the module's app/ layer are deliberately NOT vendored: the web Shell binds
// the same Engine through cn-web components instead.
export * from './config'
export * from './form'
export * from './attempts'

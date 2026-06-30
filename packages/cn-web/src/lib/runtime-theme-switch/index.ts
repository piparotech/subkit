// runtime-theme-switch — user-driven runtime theme / dark-mode switching (capability
// runtime-theme-switch; 1:1 module). The Engine is pure and isomorphic: scheme resolution
// (system/light/dark), preset resolution with base-token fallback, the config schema, and a
// storage-agnostic versioned persistence seam. Vendored here verbatim from the platform module;
// the web Shell (provider + appearance control) is built in the Storybook story on top of it.
export * from './config'
export * from './scheme'
export * from './preset'
export * from './persist'

// feature-flags-experiments — provider-neutral remote feature flags + A/B experiments (capability
// feature-flags-experiments; 1:1 module). All evaluation logic — stable variant assignment,
// targeting/rollout, the typed flag registry, the kill-switch + default-fallback store and the
// experiment exposure reporter — lives here over injected sources, so it is fully testable offline; the
// real PostHog flag source is wired in the platform module. src/ is the pure Engine vendored into the
// showcase; backend/ and the RN Shell stay in the platform module.
export * from './config'
export * from './flags'
export * from './targeting'
export * from './assignment'
export * from './experiments'
export * from './store'

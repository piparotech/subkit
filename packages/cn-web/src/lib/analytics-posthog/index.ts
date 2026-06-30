// Vendored isomorphic Engine of the @piparo/analytics-posthog module: consent-gated product analytics
// (PostHog) + crash/error reporting (Sentry). Provider-neutral and pure — all consent gating and
// event-schema enforcement live here over injected sinks, so the logic runs identically on the web
// showcase without any real SDK. The provider adapters and the consent Shell are intentionally not
// vendored.
export * from './config'
export * from './consent'
export * from './events'
export * from './tracker'
export * from './reporter'

// @piparo/web-analytics-vitals — privacy-first WEB analytics (Plausible and/or PostHog-js) for a
// marketing/SEO site (capability web-analytics-vitals; 1:1 module). Provider-neutral Engine: consent
// gating, the production-only script lifecycle, the typed goal registry and the tracker all live here
// over injected sinks/hosts, so the logic is fully unit-testable offline; the real SDK wiring is in
// ./adapters and the cookie-consent Shell lives in app/. Distinct from `analytics-posthog` (in-app
// product events): different audience, tooling and consent shape.
//
// Vendored into the web showcase from piparo-platform/modules/web-analytics-vitals/src. Only the
// isomorphic Engine is copied (config, consent, goals, loader, tracker); the SDK adapters and the
// cookie-consent Shell stay in the platform module. The Shell here drives it through an in-memory
// ScriptHost and WebAnalyticsSink, so the demo is self-contained with no network and no SDK.
export * from './config'
export * from './consent'
export * from './goals'
export * from './loader'
export * from './tracker'

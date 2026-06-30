// search-filter — provider-neutral search & filter (capability search-filter; 1:1 module). The
// client-side fuzzy index (offline default, no external service) OR a Postgres-FTS backend endpoint —
// pick-one via config.mode. The pure Engine (fuzzy ranker + facets) is isomorphic; the isomorphic
// client talks to the backend variant. src/ (config + ranker + facets + client) is the Engine vendored
// into the showcase; backend/ + the RN Shell stay in the platform module.
export * from './config'
export * from './search'
export * from './facets'
export * from './client'

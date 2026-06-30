// Vendored Engine of the @piparo/dashboard-charts module (src/ only): the deterministic, isomorphic
// data transforms behind interactive card dashboards. Time-range windowing, KPI/series/distribution
// aggregation (computed on the way in, never in render), and the card state plus percent/amount
// presentation logic. Pure and dependency-free apart from zod; the cn-web Shell lives in the story.
export * from './config'
export * from './time'
export * from './aggregate'
export * from './cards'

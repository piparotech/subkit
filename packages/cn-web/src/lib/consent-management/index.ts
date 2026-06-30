// consent-management — provider-neutral, cross-platform consent substrate (capability
// consent-management; 1:1 module). Binds tracking/marketing SDKs to a graded user consent, persists
// the decision, and re-applies gating WITHOUT a reload. Two interchangeable surfaces of the same
// outcome: a web category banner (necessary / statistics / marketing) and a mobile 3-step sheet
// (off / anonymous / identified). src/ (model + gate + store + config) is the pure Engine vendored
// into the showcase; backend/ and the RN Shell stay in the platform module.
export * from './config'
export * from './model'
export * from './app-tracking'
export * from './gate'
export * from './store'

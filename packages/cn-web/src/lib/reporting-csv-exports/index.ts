// reporting-csv-exports — reproducible CSV report exports without a BI tool (capability
// reporting-csv-exports; 1:1 module). Named report definitions resolve to backend Drizzle queries; the
// pure CSV engine serializes the rows deterministically (UTF-8 BOM for Excel, RFC-4180 escaping) with
// sensitive-field masking/exclusion. Auth-module-agnostic: export rows are keyed by the verified
// auth subject, so a caller only ever touches their own exports. src/ (CSV engine + schemas + client) is
// the Engine vendored into the showcase; backend/ + the RN Shell stay in the platform module.
export * from './config'
export * from './report-def'
export * from './csv'
export * from './client'

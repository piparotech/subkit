// data-table-server — server-side sortable/filterable/paginated data table (capability
// data-table-server; 1:1 module). The fetch + aggregate happen on the server, so backoffice and
// portal lists stay fast and consistent at scale, returning only the requested page plus the total
// count with a stable sort order. Row-level read permission is enforced in the query, never in the
// UI. src/ (shared query contract + config schema + isomorphic client) plus the isomorphic
// useDataTable controller are the Engine vendored into the showcase; backend/ + the RN Shell stay in
// the platform module.
export * from './query'
export * from './config'
export * from './client'
export * from './use-data-table'

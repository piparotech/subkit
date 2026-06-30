// Vendored calendar-msgraph Engine (pure, isomorphic subset) — capability calendar-msgraph: bidirectional
// Microsoft-365 calendar sync over Microsoft Graph. Copied verbatim from
// piparo-platform/modules/calendar-msgraph/src (config + shared event schema + Graph mapping + the pure
// sync engine + the in-memory Graph fake). The server pieces (client fetch surface, token crypto, backend
// store, RN Shell) are intentionally NOT vendored: this demo wires the Engine straight to the fake Graph
// port, so nothing touches a live graph.microsoft.com endpoint.
export * from './config'
export * from './event'
export * from './graph'
export * from './sync'
export * from './fakeGraph'

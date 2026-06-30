// Vendored isomorphic Engine of the piparo-platform `realtime-web-client` capability: the
// deterministic EventSource state machine (lifecycle, auth handshake, backoff reconnect, and
// resume-from-sequence so no event is lost on a drop) plus the shared SSE wire protocol, the framing
// helpers and config. Pure TypeScript + zod, no server/RN/DOM-global dependency — the `EventSource`
// and timers are injected, which is the seam the showcase mocks. Web pendant to realtime-websocket.
export * from './config'
export * from './protocol'
export * from './stream'
export * from './connection'

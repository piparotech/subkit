// payments-iap-stripe — App-Store-conformant purchases + subscriptions across native and web
// (capability payments-iap-stripe; 1:1 module). Native In-App-Purchase (expo-iap) + Stripe Checkout
// web fallback, both resolving to ONE `sub`-keyed, server-validated entitlement (so mobile and web
// stay in sync). The server NEVER trusts a client receipt — it re-validates with the store before
// granting Pro. Vendored Engine: the pure, isomorphic src/ (config, schema, client, receipts).
export * from './config'
export * from './plans'
export * from './receipts'
export * from './client'

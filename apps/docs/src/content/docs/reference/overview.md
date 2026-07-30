---
title: Reference
description: SubKit's public surfaces — SDK keys and capabilities, Runtime API, Server API, and the error model.
---

SubKit exposes two authenticated HTTP surfaces plus two SDKs that wrap them.
This section is the contract-level reference. For task-oriented guides, see
[Expo](/docs/expo/overview/) and [Node.js](/docs/node/overview/).

## Keys and capabilities

- **SDK key (`sk_sdk_…`)** — public, app-bound. Used by the Expo SDK and the
  Runtime API. Resolves only the app; verified store evidence determines the
  environment. Cannot mutate commerce or access.
- **Server key (`sk_srv_…`)** — tenant/app-scoped with explicit capabilities
  (for example `payments:write`, `sdk_keys:write`). Used by the Node SDK and the
  Server API. Stored only as a hash.

Neither runtime nor app backends may write grants directly. Commerce and access
mutations go through typed source, contract, pool, and allocation endpoints.

## Runtime API and Expo decision surface

Per-app authenticated, scoped surface the mobile SDK calls. It reconciles
verified purchases and publishes CustomerInfo. The Expo SDK converts that raw
read model into the public `EntitlementAccessDecision` plus separate lifecycle
states. Apps use `getAccess(key)`, `hasAccess(key)`, `useSubKitAccess(key)`, or
`useSubKitHasAccess(key)` instead of combining raw fields:

- offerings for a placement/platform,
- customer info,
- entitlement checks,
- IAP reconcile.

Raw CustomerInfo remains an advanced diagnostics/recovery surface. A resolved
commercial entitlement is not automatically granted when installation policy
requires device recovery.

## Server API

Tenant/app-scoped, capability-gated surface for trusted backends:

- subjects and billing accounts,
- contracts, normalized external payments, and manual provisions,
- reservations, claims, allocations, and pool/allocation lifecycle,
- entitlement checks and customer info,
- offerings and products.

Every mutation requires an idempotency key, an audit reason, and the matching
capability.

## Error model

- **Domain results** like `allowed: false` are normal and are not errors.
- **Transport/auth/validation failures** surface as `SubKitApiError` in the
  SDKs, carrying `code`, `status`, and `requestId`.
- Some error codes are retryable; others fail closed. The SDKs never include
  secrets, receipts, or raw store payloads in errors.

## Detailed reference

- [HTTP API](/docs/reference/api/) — endpoint inventory, auth, capabilities, and mutation headers.
- [Error model](/docs/reference/errors/) — codes, statuses, retry policy, and safe reactions.

## Related

- [Choose an integration](/docs/start/choose-an-integration/)
- [Security model](/docs/operations/security/)

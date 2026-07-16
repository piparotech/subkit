---
title: Source of truth
description: SubKit owns catalog, normalized commerce events, and derived access. Store and payment providers are verified inputs, never competing truth.
---

SubKit is the authoritative system for **catalog, commerce, and access**. App
backends and apps consume SubKit state through scoped runtime and server APIs —
for example, "does app user X have entitlement Y?" — and do not store an
authoritative parallel state for subscription, license, seat, invitation, or
term.

## What SubKit owns

- The **catalog**: apps, entitlements, products, mandatory plans,
  plan-entitlement rules, prices, offers, offerings, and store bindings.
- Normalized **commerce** events: free enrollments, store subscriptions and
  purchases, direct subscriptions, contracts, trials, promotions, manual
  provisions, migration records, and payment transactions.
- **Access sources, pools, allocations**, and the derived entitlement grants.

Whether a plan is free or paid, its term and capacity, which channel sells it,
and which trials, promotions, or admin functions apply are all configured as
**versioned SubKit configuration** — not hardcoded in a host app.

## Inputs are verified, never trusted blindly

Store and payment systems feed SubKit **only through verified sources**: Apple
App Store Server Notifications, Google Play RTDN, transaction validation,
payment webhooks, or deliberate operator actions. Unverified client claims
create no access.

This is the fail-closed principle: a client saying "I bought this" is not
access. Provider-side verification is.

## Why this matters

Because SubKit holds the truth, external systems can drift, retry, or send
duplicate events without corrupting access. SubKit normalizes every verified
cause into the same access path and derives entitlements from it:

```text
Access Source → Access Pool → Reservation/Allocation → Entitlement Grant
```

Store snapshots, commerce objects, payment transactions, access sources, pools,
allocations, derived grants, and operator edits stay distinguishable — you can
always tell what caused a given access state.

## Related

- [Catalog](/concepts/catalog/)
- [Commerce](/concepts/commerce/)
- [Access model](/concepts/access-model/)

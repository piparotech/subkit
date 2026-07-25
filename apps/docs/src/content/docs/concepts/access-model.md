---
title: Access model
description: Source → Pool → Reservation/Allocation → Grant. Why every commerce cause resolves to the same access path.
---

The access model is the heart of SubKit. Every cause of access — no matter how
it was paid for — resolves through one path:

```text
Access Source → Access Pool → Reservation/Allocation → Entitlement Grant
```

## The objects

- **Access Source** — the verified normalization of a concrete commerce object
  for the access domain. A verified subscription, contract, promotion, or free
  enrollment each becomes a source.
- **Access Pool** — the finite or unbounded capacity of a source. A single
  subscription is a pool with capacity 1; a club contract is a pool with
  capacity N.
- **Reservation** — capacity held for an open invitation before it is claimed.
- **Allocation** — an assignment of capacity from a pool to an access subject.
- **Entitlement Grant** — the derived access result, computed from the source,
  pool, allocation, and plan rule. It is never edited directly.

## Single subscription

A personal subscription is the simple case:

```text
Store Subscription → Source → Pool(capacity 1) → Allocation(app user) → Grant(pro)
```

## Club / seat model

A club license with N seats is the same path with more capacity:

```text
Contract → Source → Pool(capacity N) → Reservation(invite) → Allocation(trainer) → Grant(pro)
```

Invitations reserve capacity first, then a claim turns a reservation into an
allocation. This prevents overselling seats: capacity is held the moment an
invite is sent, not only when it is accepted.

## Effective entitlement

An **effective entitlement** is the authoritative access state. It is computed
from a verified source, an active pool, an active allocation, and the derived
grant. This is what runtime APIs answer, and what your app checks.

## Why this design

Because a store subscription and a club contract both end in the same grant,
your app logic is stable across commerce types. You check
`entitlements[key]?.active`, and SubKit is responsible for tracing that back to
whatever verified cause created it.

## Related

- [Commerce](/docs/concepts/commerce/)
- [Identity and tenancy](/docs/concepts/identity-and-tenancy/)
- [Node.js backend](/docs/node/overview/)

---
title: Commerce
description: The normalized commerce causes SubKit recognizes, and how payment evidence stays separate from access.
---

Commerce is the set of verified **causes** that can create access. SubKit
normalizes each cause into a common access source, so downstream access logic
does not branch per commerce type.

## Commerce causes

An active entitlement can originate from any of these:

- **Free Enrollment** — server-verified free access; eligibility comes from the
  published plan version, not caller input.
- **Store Subscription** — an Apple or Google subscription.
- **Store Purchase** — a non-subscription store purchase.
- **Direct Subscription** — a subscription billed outside the stores.
- **Contract** — an external agreement, e.g. a club or organization license.
- **Trial** — a time-boxed grant per plan-version policy.
- **Promotion** — access from a redeemed promotion code.
- **Manual Provision** — a deliberate operator grant.
- **Migration** — access imported from a prior system.

None of these create special-case grants. They all become regular access
sources, pools, and allocations.

## Payment evidence is separate

Creating a contract provisions its verified access source and pools. It does
**not** fabricate a charge. Payments are recorded separately as verified
evidence — from a PSP, invoice, or settlement — through a key with the
`payments:write` capability.

The normalized payment identity `(app, provider, externalId, kind)` is
immutable. Exact retries are idempotent; conflicting amount, currency, payer, or
source evidence fails closed. CPQ, invoice/tax calculation, and monetary seat
proration stay in your external commercial system.

## Why normalize

A store subscription and a club contract are different commerce causes for the
**same** technical access. Because both normalize to the access path, your app
asks about entitlements and never needs to know which cause paid for them.

## Related

- [Source of truth](/docs/concepts/source-of-truth/)
- [Access model](/docs/concepts/access-model/)
- [Node.js backend](/docs/node/overview/)

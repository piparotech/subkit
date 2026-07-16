---
title: Glossary
description: SubKit terminology — public product terms, technical objects, and deliberately avoided legacy terms.
---

## Core objects

- **Entitlement** — the stable access key your app checks (e.g. `pro`). What
  your code gates on.
- **Entitlement Grant** — the derived result that makes an entitlement active
  for a subject. Never edited directly.
- **Effective entitlement** — the authoritative access state, computed from a
  verified source, active pool, active allocation, and grant.
- **Access Source** — verified normalization of a commerce object for the access
  domain.
- **Access Pool** — the capacity of a source; capacity 1 for a single
  subscription, N for a seat contract.
- **Reservation** — capacity held for an open invitation before it is claimed.
- **Allocation** — an assignment of pool capacity to an access subject.

## Subjects

- **App User** — an end user of your product. The public product term.
- **Organization** — a group subject (e.g. a club) that receives distributed
  access.
- **Access Subject** — the recipient of access; an app user or organization.
- **Billing Account** — the payer, distinct from the recipient.
- **Console / operator user** — a user of the SubKit console, not an app user.

## Catalog

- **Product** — a sellable thing; carries no store IDs or prices itself.
- **Plan** — a product's mandatory term/capacity/entitlement configuration.
- **Plan Version** — an immutable published snapshot of a plan.
- **Offering** — the runtime paywall grouping an app renders.
- **Store Binding** — the link to a concrete Apple/Google product or offer.

## Keys

- **SDK key (`sk_sdk_…`)** — public, app-bound, used in mobile apps. Cannot
  mutate commerce or access.
- **Server key (`sk_srv_…`)** — capability-scoped, used only in trusted
  backends.
- **accessContext** — a short-lived signed token binding reads to a
  provider-verified store environment.

## Terms to use, and avoid

- Use **"App User"** as the product and technical term for an end user.
- **License / Lizenz** stays product and contract language, but is **not** a
  generic technical root object. Access is modeled as sources, pools,
  allocations, and grants — not as a root "license" record.
- Do not phrase app checks as "has a subscription/license"; phrase them as "has
  entitlement X".

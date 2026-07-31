---
title: Glossary
description: SubKit terminology — public product terms, technical objects, and deliberately avoided legacy terms.
---

## Core objects

- **Entitlement** — the stable access key your app checks (e.g. `pro`). What
  your code gates on.
- **Entitlement Grant** — the derived result that makes an entitlement active
  for a subject. Never edited directly.
- **Commercial entitlement state** — whether the requested entitlement has an
  active derived grant, independent of installation recovery.
- **Effective Access decision** — the authoritative feature-gate union that
  combines the requested entitlement, installation/device authorization, and
  bounded offline evidence. Only `granted` unlocks.
- **Device recovery** — a `device_blocked` Effective Access state with a typed
  reason and recovery path; it is not an inactive purchase.
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
- **Billing Account** — the tenant-scoped commercial identity. It can
  participate as payer, contract holder, sponsor, or previous payer and remains
  distinct from every access subject.
- **Payer** — the billing account that funds a purchase or contract.
- **Contract Holder** — the billing account that legally or operationally holds
  a contract. It may be the same row as the payer, but the role stays explicit.
- **Licensee** — the organization access subject that holds an organization
  license. A licensee relationship does not itself allocate capacity or grant
  an entitlement.
- **Recipient** — the app-user or organization subject receiving an allocation
  or benefiting from an entitlement grant.
- **Store Lineage** — a system-managed subject for portable Apple/Google
  ownership history. It is never silently merged with an app user.
- **Lifecycle Event** — one append-only, provider-neutral explanation of an
  evidenced business or support change. It never grants access.
- **Participation** — a role-bearing link from one lifecycle event to a subject
  or billing account, allowing one canonical event to appear in several
  customer views.
- **Console / operator user** — a user of the SubKit console and an actor in
  audit evidence, not an app user.

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
- Do not phrase app checks as "has a subscription/license". Name entitlement X
  in the Effective Access API and gate on its `granted` decision.

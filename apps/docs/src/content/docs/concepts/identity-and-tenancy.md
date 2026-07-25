---
title: Identity and tenancy
description: Tenants, apps, app users, organizations, access subjects, billing accounts, and store environments — and how they relate.
---

SubKit separates _who pays_ from _who receives access_, and _who uses your app_
from _who operates SubKit_. Keeping these distinct is what makes the access
model unambiguous.

## The subjects

- **Tenant** — the top-level workspace boundary. Everything is scoped to a
  tenant.
- **App** — a product within a tenant. Catalog, keys, and access are per app.
- **App User** — an end user of your product. This is the product term used in
  UI, docs, and discussion, and it replaces any older generic user concept.
- **Organization** — a group subject, such as a club, that can receive access
  distributed across seats.
- **Access Subject** — the recipient of access. App users and organizations are
  different subject types.
- **Billing Account** — the payer. Distinct from the access subject: a club can
  pay (billing account) for access allocated to individual trainers (access
  subjects).
- **Store Environment** — the provider-verified environment (e.g. production vs.
  sandbox) that a real purchase belongs to. A signed `accessContext` binds later
  reads to the verified environment.

## Payers vs. recipients

A billing account is who pays. An access subject is who gets the entitlement.
They are frequently the same person for a personal subscription, and
deliberately different for organization licenses:

```text
Billing Account (club, payer)
  └── Contract → Pool(capacity N)
        └── Allocation → Access Subject (trainer, recipient) → Grant
```

## Console users are not app users

The people who operate the SubKit console — subscription, growth, support, and
release operators — are **console/operator users**. They are not app users and
must not be confused with them.

## Related

- [Access model](/docs/concepts/access-model/)
- [Glossary](/docs/concepts/glossary/)

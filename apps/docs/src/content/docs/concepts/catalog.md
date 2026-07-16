---
title: Catalog
description: How SubKit models products, plans, immutable plan versions, prices, offers, offerings, and store bindings.
---

The catalog is the configured shape of what you sell and what it grants. It is
store-agnostic: products carry no store IDs, prices, or trial flags directly.
Those live in versioned plan configuration and store bindings.

## Objects

- **App** — the product boundary; everything below is scoped to an app.
- **Entitlement** — the access key your app checks, for example `pro`. Stable
  even when multiple products grant it.
- **Product** — a sellable thing. Carries no store IDs or prices itself.
- **Plan** — a product's mandatory configuration of term, capacity, and
  entitlement rules.
- **Plan Version** — an immutable, published snapshot of a plan. Freezes the
  price/free model, term, sales channels, pool capacities, capacity-change
  policy, and entitlement rules for new sources.
- **Price / Offer** — monetary and promotional configuration on a plan version.
- **Offering** — the runtime-facing grouping of packages an app renders as a
  paywall, resolved against the live store catalog.
- **Store Binding** — the link between a SubKit product/offer and a concrete
  Apple product or Google base plan/offer.

## The chain

```text
Product → Plan → Plan Version (immutable) → Offering → Store Binding
```

## Immutability matters

When a plan version is published, its commercial terms are frozen for any new
access source created from it. Existing sources keep their pinned version even
after the plan evolves or is retired. This is what lets you change pricing or
capacity policy without silently rewriting access that already exists.

## Runtime catalog vs. configured catalog

Package identifiers, store product IDs, prices, billing periods, trials, and
offers are **runtime catalog data** — resolved live from the store. Apps read
them from the offering and never hardcode them. The configured catalog decides
_what_ exists and _what it grants_; the runtime resolution decides _the current
purchasable price and identifier_.

## Related

- [Commerce](/concepts/commerce/)
- [Access model](/concepts/access-model/)
- [Stores](/stores/overview/)

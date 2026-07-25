---
title: Go-live checklist
description: What to verify before taking a SubKit-backed product to production.
---

Work through this before your first production purchase.

## Catalog

- [ ] Products, plans, and the intended plan versions are published.
- [ ] Each entitlement your app checks maps to at least one published plan.
- [ ] Offerings resolve against the live store catalog with real prices.
- [ ] Store bindings point at the correct Apple products / Google base plans.

## Keys

- [ ] A public SDK key (`sk_sdk_…`) is issued and used in the app config.
- [ ] Server keys (`sk_srv_…`) are scoped per app with only the needed
      capabilities and stored as secrets, never in client code.

## Stores

- [ ] Apple catalog credentials validate, and a real Sandbox purchase proves
      App Store Server API verification with the configured Apple key.
- [ ] Apple Server Notifications V2 reach the configured SubKit endpoint.
- [ ] Google service-account permissions cover app/catalog reads, financial
      purchase data, and subscription management.
- [ ] Google RTDN test delivery reaches SubKit through authenticated Pub/Sub.
- [ ] Production vs. sandbox environments are separated.

## Purchases and access

- [ ] A real test purchase produces a verified source and an active entitlement.
- [ ] The app unlocks only after `entitlements[KEY]?.active === true`.
- [ ] Restore works after reinstall and device change.
- [ ] The pending purchase path shows a confirming state and resolves via sync.

## Operations

- [ ] Observability covers verification failures, drift, and webhook/RTDN
      delivery.
- [ ] `SECRET_ENCRYPTION_KEY` is stable and backed up.
- [ ] Store writes remain disabled unless explicitly needed and gated.

## Related

- [Apple App Store setup](/docs/stores/apple/)
- [Google Play setup](/docs/stores/google-play/)
- [Security model](/docs/operations/security/)
- [Troubleshooting](/docs/operations/troubleshooting/)

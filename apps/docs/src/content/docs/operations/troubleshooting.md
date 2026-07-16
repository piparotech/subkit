---
title: Troubleshooting
description: Common SubKit integration symptoms and what to check first.
---

Organized by symptom. Each points at the most likely cause.

## No offering / empty paywall

- The configured store product is not currently purchasable — a missing
  `storeProduct` means it must not be replaced with a static price.
- Store bindings are missing or point at the wrong Apple/Google product.
- The offering has no packages for the current platform/placement.

## Purchase stays pending

- This is normal for Expo IAP. Entitlement confirmation happens through SubKit
  sync, not the returned call.
- Show a confirming state and wait for automatic sync, foreground sync, or a
  later `getCustomerInfo()`.
- Do not unlock until `entitlements[KEY]?.active === true`.

## Entitlement missing after a verified purchase

- The purchase was verified, but the expected entitlement is not active — keep
  access locked and check that the plan version grants that entitlement.
- Confirm the app is checking the right entitlement key, not a package or
  store-product ID.

## Ownership conflict

- A purchase belongs to a different app user. SubKit returns the conflict; it
  does not silently transfer ownership. Resolve identity before retrying.

## Store drift

- The store catalog differs from SubKit's snapshot. Drift is read-only until an
  operator reviews it. Writes require preview → confirm → apply → verify.

## Webhook / RTDN not arriving

- Apple Server Notifications or Google RTDN are misconfigured or unauthenticated.
- Unverified events create no access, so missing notifications look like missing
  entitlements. Verify provider configuration and delivery.

## Auth / capability denied

- A server call used a key without the required capability, or a mutation was
  missing an idempotency key or reason.
- Mobile calls must use a public SDK key; server mutations must use a scoped
  server key.

## Related

- [Expo / React Native](/expo/overview/)
- [Security model](/operations/security/)

---
title: Stores
description: How SubKit connects to Apple and Google — verified reads, confirmed writes, and the shared store boundary.
---

Apple and Google connect behind the same SubKit store boundary. Runtime
verification, authenticated notifications/RTDN, catalog adapters, credentials,
store bindings, and environment isolation are implemented for both providers.
Host apps consume the same offering and customer-info contracts without
provider-specific catalog constants.

## Store state is observation, not truth

The store catalog is read into append-only snapshots; differences become drift
items. Store state never overrides SubKit — it is an input that SubKit verifies
and normalizes.

## Reads are automatic; writes are not

- **Store → SubKit reads** (catalog import, snapshots, drift) run automatically
  on a scheduler and on demand. They are read-only and safe.
- **SubKit → Store writes** never happen automatically. They go through:

  ```text
  Preview → explicit confirmation → Apply → Verify
  ```

  Writes are gated behind a feature flag and require a typed confirmation.
  Canonical edits only mark bindings as drifted; they never silently push.

## Apple

Apple integration uses App Store Connect credentials, App Store Server
Notifications V2, transaction validation, and environment separation
(production vs. sandbox). Verified transactions create access sources;
unverified client claims do not.

Follow [Apple App Store setup](/docs/stores/apple/) to configure credentials,
subscriptions, store bindings, notifications, and Apple Sandbox testing.

## Google Play

Google Play integration uses a Developer API service account, authenticated
Cloud Pub/Sub delivery, Real-time Developer Notifications (RTDN), and exact
package/product/base-plan bindings. The same verification boundary applies:
only provider-verified evidence creates access.

Follow [Google Play setup](/docs/stores/google-play/) to configure service accounts,
Pub/Sub, RTDN, subscriptions, store bindings, Internal Testing, and License
Testing.

## The verification boundary

Provider-specific logic lives only at the adapter edges. Everything past the
adapter — sources, pools, allocations, grants — is store-agnostic. That is why
a store subscription and a contract can produce the same entitlement.

## Related

- [Apple App Store setup](/docs/stores/apple/)
- [Google Play setup](/docs/stores/google-play/)
- [Catalog](/docs/concepts/catalog/)
- [Source of truth](/docs/concepts/source-of-truth/)
- [Go-live checklist](/docs/operations/go-live/)

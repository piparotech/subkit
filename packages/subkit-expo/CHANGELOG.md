# Changelog

## 0.1.13

### Patch Changes

- **BREAKING:** Bind personal billing portal actions to the displayed billing account. Read the opaque `accountContext` from billing management discovery and pass that exact context to portal creation. Retain the original idempotency key and context after an uncertain outcome; refresh the displayed account after an authorization conflict rather than replaying the operation for another account. Subscription summaries expose their owned account context independently of effective access.

  **BREAKING:** Guest checkout creation requires the reviewed offering `selectionRevision`. Reservation claims require the exact reviewed reservation identity. Update consumers to retain these values from the corresponding read responses, rather than constructing replacements on retry.

  Add read-only checkout resumption and original-request recovery, reservation preview and recovery, original-operation cancellation, organization purchase contracts, neutral licensee and pool facts, subject filtering and license ordering discovery. These APIs require a service deployment supporting the corresponding capabilities; publish SDKs and upgrade consumers only as part of that coordinated rollout. Existing access credentials do not grant personal billing authority.

  Expo preserves pending purchase and reconciliation outcomes and requires accepted transaction evidence before reporting a successful purchase. Callers must handle pending outcomes without treating them as confirmed access.

- Updated dependencies
  - @piparotech/subkit-core@0.2.0

## 0.1.12 - client repository split

- Release the Expo client from the dedicated consumer repository.
- Accept the nullable and forward-compatible React Native AppState surface.

## 0.1.11 - published

- Add `client.getAccess()` and `client.hasAccess()`.
- Add `useSubKitAccess()` and fail-closed `useSubKitHasAccess()`.
- Add imperative Effective Access snapshots, refresh, and subscriptions.
- Separate access decisions from `unconfigured`, `loading`, `offline_unavailable`, and `error` lifecycle states.
- Remove `useSubKitEntitlement()` from the public integration path.
- Normalize network transport failures to the structured retryable `network` error code.

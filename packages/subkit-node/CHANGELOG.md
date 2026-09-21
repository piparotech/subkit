# Changelog

## 0.3.0

### Minor Changes

- d71de6b: Add checkout.expireGuestSession for safely ending an unpaid Sandbox checkout before changing a selection. Requires a service supporting the guest checkout expire action and direct_billing:write capability. Only the expired result permits a replacement; completed or unavailable results must preserve the original purchase. Publish the SDK first, deploy the matching service capability, then enable replacement flows in consumers.

### Patch Changes

- Updated dependencies [d71de6b]
  - @piparotech/subkit-core@0.4.0

## 0.2.1

### Patch Changes

- Updated dependencies [ef1595f]
  - @piparotech/subkit-core@0.3.0

## 0.2.0

### Minor Changes

- **BREAKING:** Bind personal billing portal actions to the displayed billing account. Read the opaque `accountContext` from billing management discovery and pass that exact context to portal creation. Retain the original idempotency key and context after an uncertain outcome; refresh the displayed account after an authorization conflict rather than replaying the operation for another account. Subscription summaries expose their owned account context independently of effective access.

  **BREAKING:** Guest checkout creation requires the reviewed offering `selectionRevision`. Reservation claims require the exact reviewed reservation identity. Update consumers to retain these values from the corresponding read responses, rather than constructing replacements on retry.

  Add read-only checkout resumption and original-request recovery, reservation preview and recovery, original-operation cancellation, organization purchase contracts, neutral licensee and pool facts, subject filtering and license ordering discovery. These APIs require a service deployment supporting the corresponding capabilities; publish SDKs and upgrade consumers only as part of that coordinated rollout. Existing access credentials do not grant personal billing authority.

  Expo preserves pending purchase and reconciliation outcomes and requires accepted transaction evidence before reporting a successful purchase. Callers must handle pending outcomes without treating them as confirmed access.

### Patch Changes

- Updated dependencies
  - @piparotech/subkit-core@0.2.0

## Unreleased - direct billing contract correction

- Resolve first-slice Individual Billing Account selection server-side from the authenticated active app-user Subject; direct billing requests no longer accept a Billing Account ID, email, or display name.
- Align the Node client with HTTPS redirects, canonical provider-state statuses, and SubKit-owned prefixed intent IDs.

## 0.1.11 - direct billing client surface

- Add `checkout.createSession()` for offering/package-driven hosted direct checkout.
- Add `billing.createPortalSession()` and `billing.getSummary()` with opaque redirects and canonical summary fields.

## 0.1.10 - client repository split

- Release the Node client from the dedicated consumer repository.
- Report the correct SDK version in the default User-Agent header.

## 0.1.9 - published

- Coordinate the Node release with Core `0.1.9` so clean consumers resolve the matching shared Effective Access contracts.
- No new Node client surface is introduced by M17.

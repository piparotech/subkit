# Changelog

## 0.5.0

### Minor Changes

- 4ce1c4e: Guest checkout accepts an optional `locale` for the checkout language, and the guest status can carry the payer name from checkout. Organization subscription reads can carry the package price and the billing name and address. The new `createOrganizationBillingPortalSession` opens the billing portal for the owner of an organization purchase.

  All new response fields are optional, so this SDK still parses responses from services that do not send them yet. Rollout order: adopt this SDK in every consumer before the service returns the new response fields; send `locale` and call the organization billing portal only after the service that supports them is deployed.

## 0.4.0

### Minor Changes

- d71de6b: Add checkout.expireGuestSession for safely ending an unpaid Sandbox checkout before changing a selection. Requires a service supporting the guest checkout expire action and direct_billing:write capability. Only the expired result permits a replacement; completed or unavailable results must preserve the original purchase. Publish the SDK first, deploy the matching service capability, then enable replacement flows in consumers.

## 0.3.0

### Minor Changes

- ef1595f: Guest checkout status can report the payer email and billing address Stripe collected during Checkout. Both fields are optional and nullable, so clients built against this version keep parsing responses from a service that does not return them yet; adopt the service change after this contract ships and only use the identity for the matching purchase reference.

## 0.2.0

### Minor Changes

- **BREAKING:** Bind personal billing portal actions to the displayed billing account. Read the opaque `accountContext` from billing management discovery and pass that exact context to portal creation. Retain the original idempotency key and context after an uncertain outcome; refresh the displayed account after an authorization conflict rather than replaying the operation for another account. Subscription summaries expose their owned account context independently of effective access.

  **BREAKING:** Guest checkout creation requires the reviewed offering `selectionRevision`. Reservation claims require the exact reviewed reservation identity. Update consumers to retain these values from the corresponding read responses, rather than constructing replacements on retry.

  Add read-only checkout resumption and original-request recovery, reservation preview and recovery, original-operation cancellation, organization purchase contracts, neutral licensee and pool facts, subject filtering and license ordering discovery. These APIs require a service deployment supporting the corresponding capabilities; publish SDKs and upgrade consumers only as part of that coordinated rollout. Existing access credentials do not grant personal billing authority.

  Expo preserves pending purchase and reconciliation outcomes and requires accepted transaction evidence before reporting a successful purchase. Callers must handle pending outcomes without treating them as confirmed access.

## 0.1.14 - guest and direct billing contracts

- Resolve first-slice Individual Billing Account selection server-side from the authenticated active app-user Subject; direct billing requests no longer accept a Billing Account ID, email, or display name.
- Require HTTPS redirects, ISO dates/durations, uppercase currency codes, canonical provider-state statuses, and SubKit-owned prefixed intent IDs.
- Use `direct_billing:read` and `direct_billing:write` as the direct billing capabilities.

- Add provider-neutral contracts for hosted direct checkout, billing portal sessions, and canonical direct billing summaries.
- Keep direct billing requests app-bound and offering/package-driven; exclude provider identifiers, payment methods, client secrets, and caller-controlled URLs.
- Add public offering, browser-bound guest purchase, verified account association and exact-source access status contracts.

## 0.1.13 - trusted publishing verification

- Verify the permanent token-free npm trusted-publishing release path.

## 0.1.12 - unpublished

- Reserved by an immutable component-tag attempt whose release tests inherited setup-node authentication; no npm version was published.

## 0.1.11 - unpublished

- Reserved by an immutable component-tag attempt whose absence guard rejected an existing package name; no npm version was published.

## 0.1.10 - client repository split

- Release the shared contracts from the dedicated consumer repository without service, database, worker, or infrastructure source.

## 0.1.9 - published

- Add the impossible-state-safe `EntitlementAccessDecision` contract.
- Add `resolveEntitlementAccess()` and `isEntitlementAccessGranted()`.
- Keep commercial entitlement evidence distinct from granted installation access.
- Require applications to consume Effective Access instead of combining raw entitlement and Device Access fields.

# Changelog

## Unreleased - direct billing contract correction

- Resolve first-slice Individual Billing Account selection server-side from the authenticated active app-user Subject; direct billing requests no longer accept a Billing Account ID, email, or display name.
- Require HTTPS redirects, ISO dates/durations, uppercase currency codes, canonical provider-state statuses, and SubKit-owned prefixed intent IDs.
- Use `direct_billing:read` and `direct_billing:write` as the direct billing capabilities.

## 0.1.11 - direct billing contracts

- Add provider-neutral contracts for hosted direct checkout, billing portal sessions, and canonical direct billing summaries.
- Keep direct billing requests app-bound and offering/package-driven; exclude provider identifiers, payment methods, client secrets, and caller-controlled URLs.

## 0.1.10 - client repository split

- Release the shared contracts from the dedicated consumer repository without service, database, worker, or infrastructure source.

## 0.1.9 - published

- Add the impossible-state-safe `EntitlementAccessDecision` contract.
- Add `resolveEntitlementAccess()` and `isEntitlementAccessGranted()`.
- Keep commercial entitlement evidence distinct from granted installation access.
- Require applications to consume Effective Access instead of combining raw entitlement and Device Access fields.

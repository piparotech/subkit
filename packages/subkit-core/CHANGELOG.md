# Changelog

## 0.1.12 - trusted publishing verification

- Verify the permanent token-free npm trusted-publishing release path.

## 0.1.11 - unpublished

- Reserved by the first immutable component-tag attempt; no npm version was published.

## 0.1.10 - client repository split

- Release the shared contracts from the dedicated consumer repository without service, database, worker, or infrastructure source.

## 0.1.9 - published

- Add the impossible-state-safe `EntitlementAccessDecision` contract.
- Add `resolveEntitlementAccess()` and `isEntitlementAccessGranted()`.
- Keep commercial entitlement evidence distinct from granted installation access.
- Require applications to consume Effective Access instead of combining raw entitlement and Device Access fields.

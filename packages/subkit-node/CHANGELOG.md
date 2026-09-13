# Changelog

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

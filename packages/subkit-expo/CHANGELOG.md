# Changelog

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

---
title: Troubleshooting
description: Expo SDK symptoms and their causes — configuration throws, missing store products, stuck pending, missing entitlements.
---

SDK-specific symptoms, ordered by how early they occur. For platform-wide
issues (webhooks, drift, catalog) see the
[general troubleshooting](/operations/troubleshooting/) page.

## `client` throws before any call works

**Symptom:** `client.getCustomerInfo()` or a hook throws immediately.

- `configureSubKit(...)` was not called, or is called after the first use.
  Configure at module scope so it runs before any screen renders.
- Configuration itself threw: empty `sdkKey`, empty `installationId`, an
  invalid `apiBaseUrl`, or plain HTTP against a non-local host
  (`SubKit apiBaseUrl must use HTTPS outside local development`).

## Purchases fail in Expo Go / simulator

`expo-iap` is a native module. Use a development build or EAS Build, a real
device for Apple purchases, and store-side test configuration
([Installation](/expo/installation/#native-prerequisites)).

## Package has no `storeProduct`

**Symptom:** the paywall hides packages, or purchase fails with
`product_unavailable`.

- The bound store product is not purchasable for this device/region/track.
- The package has no store product for the current platform.
- A configured Google offer is not returned as eligible by Play Billing — the
  purchase fails closed instead of buying a different offer.

Never substitute a static price; fix the store configuration or binding. Check
the product's store state in the SubKit console.

## Purchase fails with `missing_identity`

Purchases require an identified user. Call `client.identify(userId)` (or pass
`appUserId` at configure time) before offering purchases —
[Identifying users](/expo/identity/).

## Purchase stays `pending`

Normal for the Expo IAP adapter. Confirmation arrives through SubKit sync:

- keep the confirming state visible and re-check via `getCustomerInfo()`,
- verify the app can reach the SubKit runtime API,
- if it persists across launches, offer restore — the durable queue retries
  queued purchases with capped attempts.

## Purchase `verified` but entitlement missing

- The purchased plan does not grant the entitlement your code checks. Compare
  the entitlement key against the plan configuration in the console.
- You are checking a package or product identifier instead of an entitlement
  key.

## Entitlement active on one device, missing on another

- Different app users are identified on the two devices — check ownership and
  `unclaimedPurchases` ([Ownership & unclaimed](/expo/conflicts/)).
- The second device simply has not synced: trigger restore or a manual sync.

## Purchase is active but this installation is blocked

Inspect `customerInfo.deviceAccess` or the extended entitlement-hook result. If `commerciallyActive` is true, keep purchase messaging positive and render the `blockedReason` recovery path instead:

- select a redacted activation when `DEVICE_SELECTION_REQUIRED`;
- wait until `nextAllowedAt` for cooldown/change-budget denials;
- restore or re-claim after `DEVICE_REPLACED` when policy permits;
- use login/support recovery for Beneficiary conflicts.

Never display raw installation IDs, Store tokens, Lineage IDs, Subject IDs, management tokens, or Device Access tokens.

## Reinstall or device transfer changed device access

Installation IDs are best-effort local identifiers. Update normally preserves local storage; app-data clearing and uninstall commonly remove it, while SecureStore/backup behavior varies by platform. A copied identifier is not strong device authentication. Restore uses provider-verified Store evidence and Lineage semantics, not the installation ID alone.

## Access disappears while offline

Expected once offline limits pass: expiring entitlements end at `expiresAt`;
non-expiring entitlements end after the offline age limit (default 30 days).
A reconnect and refresh restores access — [Offline access](/expo/offline/).

## Hook never leaves `isLoading`

- The client is not configured (`state === 'unconfigured'`).
- The first refresh cannot reach the API and there is no cache yet
  (`state === 'error'`) — surface `error` and offer a retry.

## Related

- [Error handling](/expo/error-handling/)
- [General troubleshooting](/operations/troubleshooting/)

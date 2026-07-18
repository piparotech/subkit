---
title: Apple App Store setup
description: Connect App Store Connect, configure StoreKit products and Server Notifications V2, and verify an Apple Sandbox purchase through SubKit.
---

This guide connects one iOS app to SubKit. When finished, the app can load
Apple products from a SubKit offering, reconcile StoreKit transactions through
Apple's server APIs, and read the resulting entitlements from SubKit.

## Trust boundary

- The mobile app receives one public, app-bound SDK key (`sk_sdk_…`).
- App Store Connect credentials remain encrypted in SubKit and never ship in
  the app.
- App code does not select `production` or `sandbox`. Apple-signed transaction
  evidence determines the environment.
- A StoreKit callback alone never unlocks access. The entitlement must be active
  in the `CustomerInfo` returned by SubKit.

## Prerequisites

Before starting, make sure:

- the app exists in App Store Connect with its final bundle ID;
- the app has the In-App Purchase capability;
- the required Apple agreements, tax details, and banking details are active
  for paid products;
- you can manage App Store Connect API keys, subscriptions, and app
  information;
- the iOS app has the native IAP dependency described in
  [Expo installation](/expo/installation/);
- SubKit is reachable through HTTPS from the device and, for notifications,
  from Apple.

For a local SubKit instance, use a stable HTTPS tunnel or another device-reachable
HTTPS origin. `localhost` on an iPhone is the iPhone itself, and Apple cannot
send Server Notifications to your development machine without a public route.

## Apple credential types

Apple exposes two related but distinct key families:

| Apple key                     | Primary purpose                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| **App Store Connect API key** | App discovery, catalog import, prices, builds, reviews, provisioning metadata, and reports |
| **In-App Purchase key**       | App Store Server API requests and promotional-offer signing                                |

SubKit Preview currently exposes one workspace Apple credential form and uses
the uploaded Key ID, Issuer ID, and `.p8` material for both catalog operations
and App Store Server API transaction lookups. This combined path was exercised
by the pilot, but it is not yet a separate credential model in the Console.

Before a production launch, validate both of these operations with the uploaded
key:

1. App Store Connect catalog validation succeeds.
2. A real Apple Sandbox transaction is verified through the App Store Server
   API and activates the expected entitlement.

If either operation fails, do not substitute a broader key or bypass
verification. Use an Apple In-App Purchase key for server verification when
SubKit exposes the separate credential slot, or keep the Apple launch blocked
until the credential model is updated.

## Values you will need

| Value             | Where to find it                                    | Used for                                               |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Key ID            | App Store Connect → Users and Access → Integrations | Signing short-lived Apple API tokens                   |
| Issuer ID         | App Store Connect → Users and Access → Integrations | Identifying the App Store Connect team                 |
| Private `.p8` key | One-time download when the API key is created       | Server-side Apple API authentication                   |
| Vendor Number     | Payments and Financial Reports                      | Optional Sales and Trends report imports               |
| Apple App ID      | App Store Connect → App Information                 | Mapping the exact Apple app to SubKit                  |
| Bundle ID         | App Store Connect and the native app                | Transaction and app identity validation                |
| Notification URL  | Your public SubKit origin                           | `https://<subkit-host>/api/stores/apple/notifications` |

## 1. Create an App Store Connect API key

1. Open **Users and Access → Integrations → App Store Connect API**.
2. If API access is not enabled yet, the Account Holder must request it first.
3. Create a team key or an individual API key.
4. Grant the smallest role that covers the SubKit features you intend to use.
   Begin with read access for catalog sync and monitoring. Broader permissions
   are only needed when you intentionally enable confirmed store writes.
5. Record the **Key ID** and **Issuer ID**.
6. Download the `.p8` file and store the original securely. Apple allows the
   private key to be downloaded only once.

Team keys apply across the App Store Connect team. If you need narrower app
access, use an individual key for a user whose app access is already restricted.

## 2. Connect App Store Connect to the SubKit workspace

App Store Connect credentials belong to the workspace because one credential
can discover and import multiple apps in that Apple team.

1. Open **Workspace settings** in the SubKit Console.
2. Open the App Store Connect connection.
3. Enter the **Key ID** and **Issuer ID**.
4. Upload the private `.p8` file.
5. Enter the **Vendor Number** only if you want Sales and Trends report imports.
6. Save and validate the connection.
7. Review the capability results. App listing and the subscription/IAP catalog
   must be available for the setup in this guide.

SubKit encrypts the private key and never displays it again. To rotate the key,
upload a new `.p8` file, validate it, then revoke the old key in App Store
Connect.

## 3. Create or select the SubKit app

1. In the SubKit Console, choose **New app**.
2. Select the app returned by App Store Connect.
3. Confirm the numeric Apple App ID and bundle ID.
4. Create the SubKit app.

If the app is missing, check the App Store Connect user's app access and the
workspace capability results. Do not create a second Apple app or change the
bundle ID as a workaround.

## 4. Configure subscriptions in App Store Connect

For auto-renewable subscriptions:

1. Open the app in App Store Connect.
2. Under **Monetization → Subscriptions**, create a subscription group.
3. Create one subscription product for each purchasable duration or tier.
4. For every subscription, configure:
   - a stable Product ID;
   - subscription duration;
   - price;
   - country and region availability;
   - localization;
   - review notes and a review screenshot.
5. Put products that grant the same service at the appropriate subscription
   level.
6. Save all metadata.

Apple-specific rules to account for:

- The first auto-renewable subscription and first subscription group must be
  submitted with a new app version. Add them to the version under **In-App
  Purchases and Subscriptions**.
- Product metadata changes can take up to one hour to appear in Sandbox.
- Do not reuse an existing Product ID for commercially different terms.

## 5. Model the Apple catalog in SubKit

SubKit owns the catalog and the resulting access rules. Apple hosts the native
purchase product.

1. Create the entitlement the app checks, for example `pro`.
2. Create the product and its plan.
3. Create an immutable plan version with its term, prices, entitlement rules,
   and pool/capacity rules.
4. Enable the **Apple** sales channel on that plan version.
5. Add Apple store bindings for both **Production** and **Sandbox** using the
   matching Apple Product ID.
6. Publish the plan version.
7. Add it to a published offering.
8. In App settings, create or rotate the single public SDK key used by the app.

Production and Sandbox are separate bindings even when their Apple Product ID
is identical. SubKit serves the Apple identifier only when the visible
bindings are consistent. The app must not carry a fallback Product ID or price.

See [Catalog](/concepts/catalog/) for the Product → Plan → Plan Version →
Offering → Store Binding model.

## 6. Configure App Store Server Notifications V2

In App Store Connect, open **App Information → App Store Server Notifications**
and configure:

```text
Production Server URL:
https://<subkit-host>/api/stores/apple/notifications

Sandbox Server URL:
https://<subkit-host>/api/stores/apple/notifications

Version: 2
```

Use a public HTTPS URL with a valid certificate. Configure both environments
explicitly, even when they use the same SubKit endpoint.

Do not add a shared secret in a query string. SubKit verifies Apple's signed V2
payload, certificate chain, bundle ID, environment, and embedded transaction
before it changes access.

The initial in-app reconcile can verify a purchase before a Server Notification
arrives. Notifications are still required for the complete lifecycle: renewal,
cancellation, expiration, refund, and revocation.

## 7. Prepare Apple Sandbox testing

1. Open **Users and Access → Sandbox** in App Store Connect.
2. Create a Sandbox Apple Account with an email address that has never been used
   as a regular Apple Account.
3. Choose the storefront you want to test.
4. Enable Developer Mode on the test device when using a development-signed
   build.
5. Install a development build or TestFlight build with:
   - the expected bundle ID;
   - a device-reachable SubKit API URL;
   - the public app-bound SDK key.
6. Sign in through the device's Sandbox purchase-account setting. You do not
   need to sign out of the device's personal Apple Account for IAP testing.

Current device navigation varies by iOS version. On current releases, look under
**Settings → Developer → Sandbox Apple Account**. If the option is not visible,
start a purchase in a development build and Apple will prompt for the Sandbox
credentials.

Apple Sandbox can be slow; a purchase sheet or completed purchase may take 15
seconds or longer. TestFlight also uses Sandbox purchases even though the tester
signs in with a regular Apple Account, and its renewal timing can differ from a
development-build Sandbox test.

Xcode StoreKit Testing is useful for early client and UI tests. It does not
replace an Apple Sandbox transaction when you need evidence from Apple's server
API and App Store Server Notifications. Local StoreKit testing also cannot
prove that Apple lifecycle notifications reach SubKit.

## 8. Verify the full flow

Run the purchase through the normal app UI:

1. Identify an app user.
2. Load the offering.
3. Confirm the package has a native Apple `storeProduct` and localized price.
4. Purchase the package through the Apple Sandbox sheet.
5. Wait for SubKit to verify and persist the transaction.
6. Unlock only when the expected entitlement is active.
7. Confirm the verified transaction and active entitlement appear in the SubKit
   Console before treating the test as successful.
8. Restart the app and test **Restore purchases**.
9. Exercise renewal, cancellation, and expiration and confirm notifications
   update the same access chain.

Deleting an App User or local app data does not delete the purchase from Apple.
Use a new Sandbox account when you need a genuinely clean purchase history.

A successful purchase produces the store-agnostic chain:

```text
Verified Store Subscription
  → Access Source
  → Access Pool
  → Access Allocation
  → derived Entitlement Grant
```

The app checks the entitlement — never the Apple Product ID, subscription
group, or local StoreKit transaction state.

## Verification checklist

- [ ] App Store Connect catalog credentials validate in SubKit.
- [ ] A real Sandbox transaction proves the uploaded Apple credential can call
      the App Store Server API; otherwise production remains blocked.
- [ ] Apple App ID and bundle ID match in Apple, the app build, and SubKit.
- [ ] Every subscription has price, availability, localization, and review
      metadata.
- [ ] The first subscription is attached to a new app version when required.
- [ ] Production and Sandbox bindings use the intended Product IDs.
- [ ] The plan version and offering are published.
- [ ] The app contains only the public SubKit SDK key.
- [ ] Production and Sandbox notification URLs use V2 over public HTTPS.
- [ ] A Sandbox purchase activates access only after SubKit verification.
- [ ] Restore and notification retries do not create duplicate sources or
      grants.

## Failure modes

| Symptom                                         | Check first                                                                                                       |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| App is missing in SubKit                        | API-key user app access and workspace capability results                                                          |
| Offering has no Apple store product             | Published plan version, Apple sales channel, both bindings, and offering membership                               |
| `SKU not found`                                 | Product metadata, availability, first-subscription version attachment, and propagation delay                      |
| Purchase sheet succeeds but access stays locked | Apple credential type, App Store Server API access, Bundle/Product match, app-user identity, and entitlement rule |
| Product fails only for one tester/device        | Sandbox account, storefront, build bundle ID, and device purchase-account sign-in                                 |
| Cancellation or expiry never reaches SubKit     | Public notification URLs, V2 selection, HTTPS certificate, and Store Event delivery                               |
| Notification returns HTTP 400                   | Signed payload, bundle/app mapping, environment, and embedded transaction validation                              |

Never bypass failed verification or grant access manually to make a Store test
pass. Correct the provider or catalog mapping and repeat the test.

## Related

- [Google Play setup](/stores/google-play/)
- [Store integration overview](/stores/overview/)
- [Expo testing](/expo/testing/)
- [Security model](/operations/security/)
- [Go-live checklist](/operations/go-live/)
- [Apple: App Store Connect API](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api)
- [Apple: Generate In-App Purchase keys](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/generate-keys-for-in-app-purchases)
- [Apple: Auto-renewable subscriptions](https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions)
- [Apple: Server Notification URLs](https://developer.apple.com/help/app-store-connect/configure-in-app-purchase-settings/enter-server-urls-for-app-store-server-notifications)
- [Apple: Sandbox testing](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox)

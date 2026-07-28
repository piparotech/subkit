---
title: Google Play setup
description: Connect the Play Developer API, configure authenticated RTDN, bind subscriptions and base plans, and verify a License Tester purchase through SubKit.
---

This guide connects one Android app to SubKit. When finished, the app can load
Google Play products from a SubKit offering, verify purchases through the Play
Developer API, and process subscription lifecycle changes through authenticated
Real-time Developer Notifications (RTDN).

## Trust boundary

- The mobile app receives one public, app-bound SDK key (`sk_sdk_…`).
- Google service-account keys remain encrypted in SubKit and never ship in the
  app.
- App code does not select `production` or `sandbox`. Google provider evidence,
  including the server-side `testPurchase` marker, determines the environment.
- RTDN is a change signal, not purchase authority. SubKit re-fetches the current
  purchase and order before changing access.
- Google Play purchases are acknowledged only after SubKit accepts and persists
  the verified transaction.

## Prerequisites

Before starting, make sure:

- the app exists in Google Play Console with its final package name;
- a signed Android App Bundle that includes Google Play Billing has been
  uploaded to at least one Play track;
- a Google Payments profile is linked when the app sells paid products;
- you can manage Google Cloud projects, service accounts, Pub/Sub, and Play
  Console permissions;
- the Android app has the native IAP dependency described in
  [Expo installation](/docs/expo/installation/);
- SubKit is reachable through public HTTPS for RTDN delivery.

Use a device-reachable HTTPS origin for local app testing. `localhost` on an
Android device is the device itself, not your development machine.

## Values you will need

| Value                               | Where to find it           | Used for                                        |
| ----------------------------------- | -------------------------- | ----------------------------------------------- |
| Android package name                | App build and Play Console | Exact app and purchase verification scope       |
| Developer API service-account email | Google Cloud IAM           | Server access to catalog, purchases, and orders |
| Service-account JSON key            | Google Cloud IAM           | One-time encrypted upload to SubKit             |
| Pub/Sub topic                       | Google Cloud Pub/Sub       | Receiving RTDN from Google Play                 |
| Push service-account email          | Google Cloud IAM           | OIDC identity of the Pub/Sub push subscription  |
| RTDN endpoint                       | Your public SubKit origin  | `https://<subkit-host>/api/stores/google/rtdn`  |
| Pub/Sub audience                    | Push subscription settings | Must exactly match the RTDN endpoint URL        |

Use two service accounts:

1. a **Developer API service account** with a JSON key uploaded to SubKit;
2. a **Pub/Sub push identity** with no key, used only to authenticate delivery
   to the RTDN endpoint.

## 1. Prepare the Google Play Developer API

1. Choose or create a Google Cloud project for the Play integration.
2. Enable the **Google Play Developer API** (Android Publisher API).
3. Create a dedicated service account for SubKit.
4. Do not grant broad project roles such as Owner or Editor.
5. In Google Play Console, open **Users and permissions** and invite the service
   account email.
6. Restrict access to the intended app where possible.
7. Grant the Play permissions required for catalog and billing verification:
   - **View app information and download bulk reports (read-only)**;
   - **View financial data, orders, and cancellation survey responses**;
   - **Manage orders and subscriptions**.
8. Create and download a JSON key for this service account.

The JSON key is a server secret. Never put it in the mobile repository, app
configuration, build profile, issue tracker, or logs.

Google permission changes can take time to propagate. If a newly created or
updated credential still fails validation, re-check the project, JSON key,
package access, and permissions, then allow up to 36 hours before treating the
same configuration as invalid.

## 2. Create the Pub/Sub topic

1. Enable the **Cloud Pub/Sub API** in the selected Google Cloud project.
2. Create a topic, for example `app-rtdn`.
3. Open the topic's permissions.
4. Add Google's Play notification publisher:

   ```text
   google-play-developer-notifications@system.gserviceaccount.com
   ```

5. Grant it **Pub/Sub Publisher** on this topic only.

This permission lets Google Play publish lifecycle signals. It does not grant
access to SubKit or your Play Developer API credentials.

## 3. Create an authenticated push subscription

1. Create a second service account to act as the push identity, for example
   `subkit-rtdn-push`.
2. Do not create a JSON key for the push identity.
3. Create a Pub/Sub **push subscription** for the RTDN topic.
4. Set the push endpoint to:

   ```text
   https://<subkit-host>/api/stores/google/rtdn
   ```

5. Enable OIDC authentication and select the push service account.
6. Set the audience to the exact same URL:

   ```text
   https://<subkit-host>/api/stores/google/rtdn
   ```

7. Ensure the Pub/Sub service agent can mint a token for the push identity. If
   authenticated delivery fails because token creation is denied, grant
   **Service Account Token Creator** on the push identity to:

   ```text
   service-<project-number>@gcp-sa-pubsub.iam.gserviceaccount.com
   ```

The endpoint, audience, and configured push email must match exactly. SubKit
rejects anonymous delivery and tokens issued for a different audience or
service account.

## 4. Connect Google Play in SubKit

Google Play credentials are configured for the specific SubKit app.

1. Open the app in the SubKit Console.
2. Open **App settings → Google Play**.
3. Enter the exact **Android Package Name**.
4. Upload the Developer API service-account JSON key. SubKit extracts the
   service-account email and private key.
5. Optional for financial reporting: enter the private Play reporting bucket ID
   (`pubsite_prod_rev_*`). The service account needs global **View financial data**
   permission; SubKit requests only the `devstorage.read_only` scope.
6. Enter the exact RTDN URL in **Pub/Sub Audience**.
7. Enter the keyless push identity in **Pub/Sub Push E-Mail**.
8. Choose **Connect Google Play** or validate the existing connection.

SubKit validates Developer API access against the exact package before it
stores the connection. A failed validation does not leave partially connected
platform or integration records. A connected status and recent validation
timestamp are the first success signals; they do not replace the purchase and
RTDN tests below.

Do not reuse a credential from an unrelated Play project. Package name, Play
Developer account, service-account permissions, and SubKit app must describe
the same app.

## 5. Configure subscriptions and base plans in Play Console

1. Open the app in Google Play Console.
2. Under **Monetize → Products → Subscriptions**, create a subscription.
3. Assign a stable Product ID, for example `com.example.app.pro`.
4. Create one base plan for each purchasable term, for example:
   - `monthly`;
   - `annual`.
5. For each base plan, configure:
   - auto-renewing or prepaid behavior;
   - billing period;
   - prices and regions;
   - grace period and account hold when required;
   - optional trials or offers.
6. Activate the base plans.

Product ID and Base Plan ID are different identifiers. SubKit binds a plan
version to the exact package name, Product ID, Base Plan ID, and optional Offer
IDs.

## Controlled catalog writes

SubKit never writes to Google Play automatically. Existing product listing
metadata can be updated only through **Preview → `APPLY GOOGLE` → Apply → Verify**
and only when `SUBKIT_ENABLE_STORE_WRITES` is enabled. Product IDs, package names,
base-plan/purchase-option identities, billing periods, prices, states, offers,
create and delete operations remain blocked in this conservative first scope.
Products with multiple localized listings are also blocked rather than replacing
all translations with one canonical name.

## Financial report imports

Google Play financial exports are monthly ZIP/CSV objects in the private
`pubsite_prod_rev_*` Cloud Storage bucket, not Android Publisher report endpoints.
SubKit supports **Estimated Sales** and **Earnings** imports, handles UTF-16/UTF-8
CSV files, and persists only rows whose Package ID exactly matches the connected
app. Imports are idempotent per app, report type and month. Reports usually appear
3–7 days after activity and never grant or revoke access.

## 6. Model the Google catalog in SubKit

1. Create the entitlement the app checks, for example `pro`.
2. Create the product and its plan.
3. Create one immutable plan version per purchasable term with its prices,
   entitlement rules, and pool/capacity rules.
4. Enable the **Google** sales channel.
5. Add Google store bindings for both **Production** and **Sandbox**, including:
   - Android package name;
   - Google Product ID;
   - matching Base Plan ID;
   - allowed Offer IDs when applicable.
6. Publish the plan versions.
7. Add them to a published offering.
8. In App settings, create or rotate the single public SDK key used by the app.
9. Confirm the runtime offering contains the expected Google Product ID and Base
   Plan ID for every Android package.

The app must not contain static Google Product IDs, prices, or offer tokens.
SubKit supplies the configured identifiers; the native billing adapter loads
eligible offers and localized prices from Google Play.

See [Catalog](/docs/concepts/catalog/) for the shared catalog model.

## 7. Enable RTDN in Play Console

1. Open **Monetize → Monetization setup**.
2. Enable **Real-time developer notifications**.
3. Enter the full topic name:

   ```text
   projects/<project-id>/topics/<topic-name>
   ```

4. Select notification coverage that includes subscriptions and voided
   purchases. Include one-time product events if your catalog uses them.
5. Save the configuration.
6. Choose **Send Test Message**.
7. Verify the complete path:
   - Play Console publishes successfully;
   - Pub/Sub performs an authenticated push;
   - SubKit returns HTTP 200;
   - SubKit records the test notification as an ignored Store Event without
     creating access.

A successful test publish proves delivery and authentication. It does not prove
purchase verification; that requires a purchase from the app.

## 8. Configure Internal Testing and License Testing

1. Upload a signed AAB to the **Internal testing** track.
2. Publish the internal release.
3. Add the test account to the track's tester list.
4. Add the same account under the account-wide **License testing** settings.
5. Make the test track available in the tester's country or region.
6. Open the opt-in URL with that account. This step is mandatory; merely adding
   the email to the tester list does not opt the account in.
7. Install or update the app through Google Play.
8. Prefer a physical device. If you use an emulator, it must include the Google
   Play Store and Google Play services.
9. Keep only the intended License Tester account active in the Play Store while
   diagnosing Sandbox account-selection problems. The purchasing account is
   normally the account that installed the app.
10. Configure a screen lock/PIN if subscription checkout fails with a generic
    Play error.
11. Before confirming checkout, verify:

- the installed build is the intended Internal Testing release;
- the purchasing account is the account that installed the app;
- the checkout shows an accelerated test period;
- a test payment instrument such as **Test card, always approves** is
  selected.

12. Abort the checkout if it presents a real payment method.

A testing-track user is not automatically a License Tester. Without License
Testing, purchases in a test track can charge real money. Use a non-License
Tester only for a separately planned Production smoke test with an explicit
cost and refund plan.

## 9. Verify the full flow

Run the purchase through the normal app UI:

1. Identify an app user.
2. Load the offering.
3. Confirm each package has a native `storeProduct`, matching base plan, and
   localized Google Play price.
4. Complete a purchase using the approved test instrument.
5. Wait for SubKit to verify package, product, base plan, offer, account
   identity, purchase state, and order through the Developer API.
6. Confirm the SDK acknowledges the purchase only after SubKit accepts it.
7. Unlock only when the expected entitlement is active.
8. Confirm the verified transaction, active entitlement, and recent Store Event
   appear in the SubKit Console before treating the test as successful.
9. Restart the app and test **Restore purchases**.
10. Confirm purchase and renewal RTDN update the same access source.
11. Cancel renewal, wait for expiration, and confirm access is removed after
    the paid/test period ends.

License Tester subscriptions renew on accelerated schedules: approximately five
minutes for weekly and monthly plans, ten minutes for three-month plans, 15
minutes for six-month plans, and 30 minutes for annual plans. Google limits test
subscriptions to a small number of renewals, so use the provider state and RTDN
evidence rather than assuming production timing.

Deleting an App User or local app data does not delete the underlying Google
Play purchase. Use a fresh License Tester account or revoke/refund the previous
purchase when you need a clean purchase history.

A successful purchase produces:

```text
Verified Store Subscription
  → Access Source
  → Access Pool
  → Access Allocation
  → derived Entitlement Grant
```

The app checks the entitlement — never the Product ID, Base Plan ID, purchase
token, or local billing callback.

## Verification checklist

- [ ] Play Developer API and Pub/Sub API are enabled in the intended project.
- [ ] The Developer API service account has read-only app/catalog access plus
      the required financial and subscription-management permissions.
- [ ] Its JSON key is uploaded only to SubKit and validates against the package.
- [ ] The RTDN topic grants Google Play Publisher access.
- [ ] The push subscription uses HTTPS, OIDC, and the exact audience.
- [ ] SubKit is configured with the exact push service-account email.
- [ ] Play Console's test message reaches SubKit with HTTP 200.
- [ ] The subscription and all intended base plans are active.
- [ ] Production and Sandbox bindings contain package, Product ID, and Base Plan
      ID.
- [ ] Plan versions and the offering are published.
- [ ] The app contains only the public SubKit SDK key.
- [ ] The installed build came from Google Play and checkout shows a test
      instrument.
- [ ] The purchase is acknowledged only after SubKit verification.
- [ ] RTDN retries, restore, cancellation, and expiration remain idempotent.

## Failure modes

| Symptom                                          | Check first                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| SubKit reports package permission denied         | Play Console invitation, read-only app/catalog permission, financial/subscription permissions, exact package, and up to 36-hour propagation |
| Subscription is absent from the app              | Active product/base plan, package, store binding, published plan version, and offering                                                      |
| Checkout shows a real payment method             | Installing/purchasing account, mandatory opt-in URL, test-country availability, and License Testing list                                    |
| Play test message cannot publish                 | Full topic name and Google Play publisher permission on the topic                                                                           |
| Topic receives messages but endpoint does not    | Push URL, HTTPS certificate, OIDC settings, and Pub/Sub service-agent token permission                                                      |
| RTDN endpoint returns HTTP 400                   | Audience, issuer, verified push email, package name, and Pub/Sub envelope                                                                   |
| Test purchase is refunded shortly after checkout | Purchase was not acknowledged; fix the earlier SubKit verification failure                                                                  |
| Purchase succeeds but entitlement stays inactive | Product/base-plan/offer match, app-user identity, provider verification, and entitlement rule                                               |
| The same lifecycle event appears more than once  | Pub/Sub is at-least-once; verify idempotency by message ID and provider evidence, not client state                                          |

Never disable RTDN authentication or acknowledge a purchase before verification
to make a test pass. Correct the identity, credential, or catalog mismatch.

## Related

- [Apple App Store setup](/docs/stores/apple/)
- [Store integration overview](/docs/stores/overview/)
- [Expo testing](/docs/expo/testing/)
- [Security model](/docs/operations/security/)
- [Go-live checklist](/docs/operations/go-live/)
- [Google: Play Developer API setup](https://developers.google.com/android-publisher/getting_started)
- [Google: Billing and RTDN setup](https://developer.android.com/google/play/billing/getting-ready)
- [Google: Test your billing integration](https://developer.android.com/google/play/billing/test)
- [Google: RTDN reference](https://developer.android.com/google/play/billing/rtdn-reference)

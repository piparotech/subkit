# App Store Connect Integration Checklist

Goal: users can connect their own App Store Connect API key so this app can import app/subscription data, monitor store health, and sync Apple reports without asking for Apple ID passwords or 2FA.

## Security and credential handling

- [x] Provide an App Store Connect settings surface per app.
- [x] Collect Key ID, Issuer ID, private `.p8` key, optional Vendor Number, Apple App ID, and Bundle ID.
- [x] Store private key material encrypted server-side; never show it again after upload.
- [x] Store only non-secret metadata in the UI: Key ID, Issuer ID, fingerprint, Vendor Number, Apple App ID, Bundle ID, status, and timestamps.
- [x] Generate short-lived JWTs server-side only.
- [x] Redact secrets from errors and audit details.
- [x] Add customer-visible audit events for save, validation, sync, import, and delete actions.
- [x] Support deletion/disablement that removes encrypted key material while keeping non-secret audit history.
- [x] Use feature-level capability checks instead of requiring a broad Admin key.

## App import and mapping

- [x] Validate that the key can list App Store Connect apps.
- [x] Resolve the selected app by explicit Apple App ID or Bundle ID.
- [x] Store the resolved Apple App ID and Bundle ID on the credential mapping.
- [x] Show connection health and the mapped app in Settings.
- [x] Explain missing app access as a permission/mapping problem.

## Capability preflight

- [x] Check base app-list access.
- [x] Check app metadata/version access.
- [x] Check subscription and in-app-purchase catalogue access.
- [x] Check TestFlight/build access.
- [x] Check customer-review access.
- [x] Check provisioning/bundle-id access.
- [x] Check Sales Reports readiness via Vendor Number and report endpoint access.
- [x] Persist and display capability results as Available, Missing, or Unknown.

## Subscription product sync

- [x] Fetch App Store Connect subscription groups and subscriptions.
- [x] Fetch non-subscription in-app purchases.
- [x] Compare Apple product IDs against local products.
- [x] Produce a sync preview with create/update/unchanged/conflict actions.
- [x] Import/update local product catalogue records only after an explicit user action.
- [x] Create imported entitlement shells for Apple catalogue imports that have no local entitlement yet.
- [x] Keep product sync read-only toward App Store Connect; only local records are changed.

## Sales report sync

- [x] Accept Vendor Number as part of the connection.
- [x] Download the latest daily App Store Connect Sales Report on demand.
- [x] Store raw report imports with status, report date, row count, and error details.
- [x] Show recent report imports in Settings.
- [x] Keep report sync separate from Finance reports and mark missing Vendor Number clearly.

## Release, TestFlight, reviews, provisioning monitoring

- [x] Check read access for builds/TestFlight data.
- [x] Check read access for app versions/release metadata.
- [x] Check read access for customer reviews.
- [x] Check read access for bundle IDs/provisioning metadata.
- [x] Surface these as capability-health rows before offering deeper workflows.

## Later-stage guarded mutations

- [x] Mutating App Store Connect metadata/release/TestFlight actions are intentionally not shipped in this phase; they require a separate design pass.
- [x] No current server function writes to App Store Connect; all current Apple API calls are read-only GET/report downloads.
- [x] Local product imports require an explicit preview/import action and audit history.
- [x] Price, subscription, release, or review-response writes are not enabled by default.

## Product UX

- [x] Make the MVP path obvious: connect key, validate, preview products, import locally, sync report.
- [x] Show actionable empty states instead of "nothing configured".
- [x] Keep dangerous actions separate from read-only checks.
- [x] Use concise operator copy explaining least-privilege roles and revocation.

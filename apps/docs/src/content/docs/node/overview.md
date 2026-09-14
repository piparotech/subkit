---
title: Node.js backend
description: Drive SubKit commerce and access from trusted server code — customers, contracts, payments, seats, entitlement checks, idempotency, and errors.
---

Use `@piparotech/subkit-node` only on trusted backends. Never ship its scoped
`sk_srv_…` key in web, mobile or Expo bundles.

## Install and configure

```sh
pnpm add @piparotech/subkit-core@^0.1.11 @piparotech/subkit-node@^0.1.11
```

```ts compile
import { SubKit } from '@piparotech/subkit-node'

const secretKey = process.env.SUBKIT_SECRET_KEY
if (secretKey == null) throw new Error('SUBKIT_SECRET_KEY is required')

const subkit = new SubKit({
  apiBaseUrl: 'https://subkit.example.com',
  secretKey,
  appId: 'app_123',
})
```

Scope the key to the app and required capabilities. SubKit stores its hash;
there is no global environment key.

## The mutation contract

Mutations require a capability, explicit **idempotency key** and audited **reason**.
Exact retries retain key, reason and payload; conflicting evidence fails closed.

## Recover an authenticated checkout reference

`subkit.checkout.recoverStatus({ subjectId, idempotencyKey, entitlement })` requires
`direct_billing:read` and the matching service route. It returns the original
checkout lifecycle and `checkoutIntentId`, not a redirect or a new purchase.
Tenant, app, environment, subject and creation key must match. Missing, foreign
or ambiguous results do not prove failure: retain the original operation/key;
never fall back to creation.

## Resume the original hosted checkout form

`subkit.checkout.resumeSession({ subjectId, checkoutIntentId })` requires
`direct_billing:write` and a matching service deployment. It reads, never creates,
the original authenticated checkout in the same app/environment. The service
verifies account/customer/intent/price, one line item and current unexpired,
open, unpaid subscription state. This method excludes guest checkouts.

The URL is a bearer capability: keep it out of logs, storage, analytics and
screenshots. Navigate only after explicit same-origin and current-session checks;
preserve the local operation first. Unavailable or terminal results require
status recovery, not a replacement purchase. Return navigation is not payment proof.

## Checkout offering without a buyer

`subkit.checkout.getOffering({ offeringIdentifier: 'default' })` needs an
app/environment-scoped `direct_billing:read` key and the matching
`/api/server/direct-checkout/offering` route. It returns package labels,
amounts/currencies, periods, audience, entitlements and named pools without a
buyer. Keep each pool's key, capacity (`null` is unbounded), entitlements and
reservation policy separate. Expose tariff data, never the backend key.
The SDK rejects unexpected fields, duplicate packages and mismatched responses.
This read neither authenticates, starts checkout nor grants access.

## Guest checkout and verified account association

Keep guest APIs and keys server-side. Bind a durable UUID `purchaseReference`
to a secure browser session; select the offering, package and allowlisted return
target server-side. The app must check the key-selected environment.

1. `createGuestSession`: send the reference, offering/package, reviewed
   `selectionRevision`, return target and reason; pass the original
   `idempotencyKey` in mutation options. Preserve both identities on retry.
2. `getGuestStatus({ purchaseReference })`: `paymentVerified` means verified
   payment, not login or access. A redirect proves none of these.
3. Independently authenticate and explicitly confirm the buyer, then call
   `associateGuestPurchase` with verified `subjectId`, reference, reason and key.
   Recheck browser possession/current ownership on every attempt. Checkout email
   or a buyer-supplied Subject is not identity evidence.
4. `getStatus`: use the exact intent, verified Subject and entitlement; wait for
   `accessReady: true`, not merely successful association.

Matching guest routes and the access worker must be deployed. Do not reopen
terminal/expired checkouts or substitute SDK installation for hosted acceptance.

## Organization guest purchases

Organization purchases have a separate Billing Account. After verified payment,
browser possession and independent identity, `associateOrganizationGuestPurchase`
accepts `purchaseReference`, `subjectId`, `organizationName`, `reason` and an
idempotency key. It binds the purchase's licensee, not an app login, team or club.

`getOrganizationGuestAccess({ purchaseReference, subjectId })` rechecks ownership.
Before worker projection: `accessReady: false`, no pools. Afterwards each pool
has `poolId`, `accessSourceId`, `capacity`, `used`, `reserved`, `entitlementKeys`.
The SDK validates echoed app, subject and purchase identity. Persist the exact
purchase/source/pool binding before writes and reauthorize at reservation time.
Pool IDs are private data, not capabilities; availability is a snapshot. Never
sum unrelated pools or equate billing ownership with a personal seat.
Organization methods remain sandbox-only; production rollout is separately gated.

## Hosted direct billing

The published catalog and authenticated active app-user select the app-bound
Individual Billing Account. Callers cannot supply account IDs, email/name,
amount/currency, provider Product/Price IDs, payment methods or arbitrary URLs.
`returnTarget` selects a server allowlist entry.

```ts compile
const checkout = await subkit.checkout.createSession(
  {
    offeringIdentifier: 'default',
    packageIdentifier: 'monthly',
    reason: 'start selected direct billing checkout',
    returnTarget: 'billing_settings',
    subjectId: 'subject_123',
  },
  { idempotencyKey: 'checkout:subject_123:monthly' },
)

const management = await subkit.billing.getManagement({ subjectId: 'subject_123' })
const summary = await subkit.billing.getSummary({ subjectId: 'subject_123' })
if (
  management.environment !== summary.environment ||
  management.accountContext !== summary.accountContext
) {
  throw new Error('Billing account changed; reload the view')
}
const displayedAccountContext = management.accountContext
if (displayedAccountContext !== null) {
  const portal = await subkit.billing.createPortalSession(
    {
      accountContext: displayedAccountContext,
      reason: 'open billing settings',
      subjectId: 'subject_123',
    },
    { idempotencyKey: 'portal:subject_123:original-operation' },
  )
}
```

Redirect responses contain SubKit intent IDs (`checkout-intent:`/`billing-portal:`),
short-lived HTTPS URLs and ISO expiry. Summaries contain plan, period,
amount/currency, cancellation and normalized status, not provider IDs/payment data.

### Account-bound management (unreleased breaking change)

Retain the displayed `accountContext` for portal requests. Management and summary
must agree on context and environment. It binds account, ownership period,
mapping, app, subject, provider and environment, but never replaces authorization.
Reject stale contexts; preserve the original key/context after uncertainty.
Never fetch a replacement account on click or expand access-key capabilities.

Selection is the first eligible personal account by creation time, then ID.
Missing subscription/configuration cannot select another account. Owned-empty
summary is `none` with context; no ownership means null context. Use separate
app/environment `direct_billing:read/write` clients; management does not establish
access or purchase eligibility. Deploy the matching service before consumer
adoption. Historical context-free operations need an explicit transition, not
replacement keys; compilation alone is not release acceptance.

## Customers and access subjects

```ts compile
const subject = await subkit.customers.upsertSubject(
  { externalId: 'trainer_123', kind: 'app_user', reason: 'sync trainer identity' },
  { idempotencyKey: 'subject:trainer_123' },
)

const club = await subkit.customers.createBillingAccount(
  {
    displayName: 'FC Example',
    externalId: 'club_123',
    kind: 'organization',
    reason: 'onboard club payer',
  },
  { idempotencyKey: 'billing-account:club_123' },
)
```

## Contracts, seats, and payments

Contracts provision verified Sources/Pools, not charges. Record payment separately.

```ts compile
const contract = await subkit.contracts.create(
  {
    billingAccountId: club.id,
    externalContractId: 'contract_123',
    planVersionId: 'plan-version_123',
    reason: 'activate signed club contract',
    termStart: new Date('2027-01-01T00:00:00Z'),
  },
  { idempotencyKey: 'contract:contract_123' },
)
```

Reserve capacity for an invite, then claim it into an allocation:

```ts compile
const reservation = await subkit.access.reserve(
  {
    poolId: contract.poolIds[0],
    claimTokenHash: hash(inviteToken),
    reason: 'invite named trainer',
  },
  { idempotencyKey: 'invite:trainer_123' },
)

const preview = await subkit.access.previewReservation({
  claimTokenHash: hash(inviteToken),
  subjectId: subject.id,
})
const allocation = await subkit.access.claim(
  {
    reservationId: preview.reservation.reservationId,
    poolId: preview.reservation.poolId,
    accessSourceId: preview.reservation.accessSourceId,
    claimTokenHash: hash(inviteToken),
    subjectId: subject.id,
    reason: 'trainer accepted invitation',
  },
  { idempotencyKey: 'claim:trainer_123' },
)
```

Send the invitee the opaque token; SubKit receives only its hash.

### Preview before explicit activation

`previewReservation({ claimTokenHash: hash(inviteToken), subjectId: subject.id })`
requires `access:read`, current app/tenant/environment and an active app-user.
Send hashes in POST bodies, never URLs. Wrong assignment/claimant looks missing;
the SDK validates echoed recipient and reservation evidence.

Persist the returned reservation/source/pool and recipient before explicit claim.
Preview exposes product/plan/pool/entitlement facts, not payer data or token hashes;
it writes nothing and guarantees no later access. Unassigned tokens are bearer
invitations. Invitee-reference hashes are metadata, not email/membership proof;
app club/promotion codes remain separate.

Claim needs the exact reviewed IDs. Handle `claimed` with allocation ID, or durable
`rejected` with `changed | expired | used | recipient_mismatch | unavailable`.
Transport/auth/journal errors are not terminal rejection. Claim/audit/journal
commit together; uncertain retries retain payload/key. Recheck effective access.

### Recover an uncertain reservation claim

Persist reservation identity before delivery and claim payload/key before
activation. `readReservationClaim({ ...originalClaim, idempotencyKey })` proves
only this operation's completed journal. `pending` includes absent, processing
and historical failed journals: it never permits replacement. The same Subject's
claim may belong to another operation.

Then `getReservation({ reservationId })` reads current allocation state with
`access:read` and matching service/Core. Its non-cacheable snapshot validates
app/reservation, exposes no token/hash/list, and reports claimed allocation ID,
state, subject and timestamp. Verify durable invitation binding separately from
membership/effective access; inactivity does not authorize a new allocation.
Database-time expiry needs no write. A negative snapshot does not prove an
in-flight request failed. Preserve original identity; use matching environment
keys for Direct/Store and neutral keys for environment-neutral sources.

## Record verified payment evidence

A Contract creates a Source and Pools; it does not claim money moved. Record a
separately verified PSP, settlement, or invoice event with `payments:write`:

```ts compile
await subkit.payments.record(
  {
    accessSourceId: contract.accessSourceId,
    amountMicros: 100_000_000,
    billingAccountId: club.id,
    currencyCode: 'EUR',
    externalId: 'invoice_123:payment_1',
    kind: 'charge',
    occurredAt: new Date('2027-01-02T00:00:00Z'),
    provider: 'external',
    reason: 'record verified invoice settlement',
    state: 'succeeded',
  },
  { idempotencyKey: 'payment:invoice_123:payment_1' },
)
```

No CPQ, invoicing, tax or monetary seat proration. Payment retries reject changed
amount, currency, payer, Source or external identity.

## Enroll free access

Eligibility comes from the published Plan Version, not caller input:

```ts compile
const enrollment = await subkit.access.enrollFree(
  {
    planVersionId: 'plan-version_basis',
    reason: 'enroll eligible basis user',
    subjectId: subject.id,
  },
  { idempotencyKey: 'free-enrollment:trainer_123' },
)
```

## Redeem a promotion

Promotions create commercial Sources; invitations claim existing reserved
capacity. SubKit stores promotion codes hashed.

```ts compile
const promotion = await subkit.access.redeemPromotionCode(
  {
    code: userEnteredCode,
    reason: 'redeem customer promotion',
    subjectId: subject.id,
  },
  { idempotencyKey: 'promotion-redemption:trainer_123' },
)
```

## Provision exceptional access

Manual provision is an audited migration/support privilege, not an access bypass:

```ts compile
const allocation = await subkit.access.manualProvision(
  {
    originReference: 'migration:legacy-contract-123',
    planVersionId: 'plan-version_premium',
    reason: 'migrate verified legacy contract',
    subjectId: subject.id,
    validFrom: new Date('2027-01-01T00:00:00Z'),
  },
  { idempotencyKey: 'manual-provision:legacy-contract-123' },
)
```

All three preserve Source → Pool → Allocation → Grant; none writes entitlements directly.

## Capacity changes

Preview used/reserved capacity, effective date, renewal, cooldowns and pinned plan.
Apply only the explicitly confirmed result with its own idempotency key/reason.

## Check an entitlement

Use app-scoped `access:read` with a fixed Store environment; denial is a normal result.

```ts compile
const result = await subkit.entitlements.check({ appUserId: 'user_123', entitlement: 'pro' })

if (!result.allowed) {
  // allowed: false is a normal domain result, not an exception
}
```

## Errors

Denials (`allowed: false`) are results. Network/auth/invalid/non-2xx responses
throw `SubKitApiError`:

```ts compile
import { isSubKitApiError } from '@piparotech/subkit-node'

try {
  await subkit.entitlements.check({ appUserId: 'user_123', entitlement: 'pro' })
} catch (error) {
  if (isSubKitApiError(error)) {
    console.error(error.code, error.status, error.requestId)
  }
  throw error
}
```

SDK errors omit tokens, receipts and raw store payloads. Use bounded backoff only
for [retryable codes](/docs/reference/errors/); retain the mutation key and reason.

## Related

- [Commerce](/docs/concepts/commerce/)
- [Access model](/docs/concepts/access-model/)
- [Reference](/docs/reference/overview/)

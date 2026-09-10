---
title: Node.js backend
description: Drive SubKit commerce and access from trusted server code — customers, contracts, payments, seats, entitlement checks, idempotency, and errors.
---

The `@piparotech/subkit-node` SDK is for trusted server-to-server code only. It
carries a scoped server key (`sk_srv_…`) that can mutate commerce and access.
Never ship this key in mobile apps, web clients, or Expo bundles.

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

Use a SubKit-issued `sk_srv_…` server secret scoped to the target app and the
capabilities you need. SubKit stores only its hash; there is no global
environment key.

## The mutation contract

Every mutation requires:

- an explicit **idempotency key**,
- an operator **reason** (recorded in the immutable audit log),
- the required **capability** on the key.

Exact retries reuse the same idempotency key and the same audit reason. They are
safe only for the same logical mutation; conflicting evidence fails closed.

## Recover an authenticated checkout reference

`subkit.checkout.recoverStatus({ subjectId, idempotencyKey, entitlement })` reads the existing authenticated checkout using its original creation idempotency key. Use the same app and environment-bound server client. The response is the normal exact checkout lifecycle, including `checkoutIntentId`; it contains no provider redirect URL. The method neither creates a checkout nor associates a guest purchase.

The server requires `direct_billing:read` and matches tenant, app, environment, subject and key. Missing, foreign and ambiguous references are unavailable. A missing result is not proof that a previous request never took effect and must not automatically start a replacement purchase. Preserve the original operation/key while reconciling.

This requires the matching service recovery implementation; older deployed services reject the alternative selector. There is no fallback to checkout creation. Local SDK compilation is not hosted recovery evidence.

## Checkout offering without a buyer

`subkit.checkout.getOffering({ offeringIdentifier: 'default' })` reads checkout
package labels, amounts, currencies, billing periods, `audience`
(`individual` or `organization`), entitlement rules and individual named pools
without a customer or Subject. Each pool retains its key, nullable capacity
(`null` means unbounded), entitlement keys and reservation policy. Pools are
not summed: applications interpret their own catalog keys. It requires an app-scoped server key with `direct_billing:read`; the
key selects the environment. Keep the key on your backend and expose only the
returned tariff data to a public purchase page. The SDK rejects unexpected
fields, duplicate package identifiers and mismatched offering responses.

This method does not create a checkout, authenticate a buyer or grant access.
It requires the matching `/api/server/direct-checkout/offering` service route;
SDK availability alone does not mean that route has been deployed.

## Guest checkout and verified account association

All guest methods are trusted-server APIs. Keep the server key private. Your
application must bind a durable UUID `purchaseReference` to a secure browser
session and select the offering, package and fixed return target server-side.
Never accept a buyer-supplied Subject or use checkout email as identity proof.

1. Call `subkit.checkout.createGuestSession` with the purchase reference,
   offering/package identifiers, return target and audit reason. Supply an
   `idempotencyKey` in the second argument. Reuse that reference and key for
   retries of the same purchase, rather than preparing a new purchase.
2. Call `subkit.checkout.getGuestStatus({ purchaseReference })` after return.
   A Stripe redirect does not prove payment. `paymentVerified` reports the
   service's verified payment state, not application access or authentication.
3. Independently authenticate the buyer with your identity provider. Only then
   call `subkit.checkout.associateGuestPurchase` with that verified `subjectId`,
   purchase reference, audit reason and mutation idempotency key. The application
   must still validate browser ownership of the purchase. Association can fail
   when current identity or ownership no longer permits it, including on replay.
4. Call `subkit.checkout.getStatus` with the exact checkout intent, verified
   Subject and required entitlement. Wait for `accessReady: true`; successful
   association alone does not mean the access worker has provisioned the grant.

The server key selects the environment. Require the expected environment in your
application and do not reopen terminal or expired checkouts. These methods need
the matching guest service routes and access worker deployment; installing this
SDK does not provision those services or create an identity-provider session.

## Organization guest purchases

Organization-audience packages use a separate organization Billing Account.
After verifying payment, browser possession and the buyer's independent identity,
call `subkit.checkout.associateOrganizationGuestPurchase` with `purchaseReference`,
`subjectId`, `organizationName`, `reason` and mutation options containing the
idempotency key. The service binds a new organization licensee for that exact
purchase; it never establishes an application login or creates an application
team or club.

`subkit.checkout.getOrganizationGuestAccess({ purchaseReference, subjectId })`
reads the exact organization purchase with current owner authorization. Until
verified access is ready it returns `accessReady: false` and no pools. Once the
worker has projected the licensee and pools, each named pool exposes its own
`poolId`, `accessSourceId`, `capacity`, `used`, `reserved` and `entitlementKeys`.
The response echoes `appId` and the authenticated owner `subjectId`; the SDK
checks both plus the requested purchase reference. Pool IDs are private Server
API data for a later explicitly authorized reservation, not a capability by
themselves. Resolve the pool by its configured key/entitlements, persist the
purchase/source/pool binding before writes, and recheck current ownership.
Do not add unrelated pool capacities or interpret billing ownership as a
personal seat allocation. Availability is a snapshot; a reservation still
requires canonical capacity and authorization checks at mutation time.
These organization methods are currently enabled for sandbox purchases only;
production rollout remains separately gated.

## Hosted direct billing

Direct billing is selected from the published catalog and remains bound to the
app and beneficiary Subject. For the first Individual slice, the service
resolves or creates the Individual Billing Account from the authenticated
active app-user Subject; the Node SDK does not accept a Billing Account ID,
email, or display name for that selection. It also does not accept amounts, currencies,
Stripe Product/Price IDs, payment methods, or arbitrary success/cancel URLs.
`returnTarget` is a server-configured allowlist key.

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

const portal = await subkit.billing.createPortalSession(
  {
    reason: 'open billing settings',
    subjectId: 'subject_123',
  },
  { idempotencyKey: 'portal:subject_123' },
)

const summary = await subkit.billing.getSummary({
  subjectId: 'subject_123',
})
```

Checkout and portal return only SubKit-owned intent IDs (`checkout-intent:` or
`billing-portal:`) and short-lived HTTPS redirect URLs with ISO datetime
expiry. The summary exposes canonical plan, period, amount/currency,
cancellation, and normalized provider-state status fields without provider IDs
or payment-method data.

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

Creating a contract provisions its verified access source and pools. It does not
fabricate a charge — record payment evidence separately.

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

const allocation = await subkit.access.claim(
  {
    claimTokenHash: hash(inviteToken),
    subjectId: subject.id,
    reason: 'trainer accepted invitation',
  },
  { idempotencyKey: 'claim:trainer_123' },
)
```

Invitation tokens stay outside SubKit — send the opaque token to the invitee and
submit only its hash.

### Preview before explicit activation

An authenticated application backend can call
`subkit.access.previewReservation({ claimTokenHash: hash(inviteToken), subjectId: subject.id })`
with `access:read`. The hash stays in a POST body, not a URL. The service checks
app/tenant/environment and an active app-user Subject before disclosure. Wrong
assignment or another claimant is indistinguishable from a missing token.
The SDK validates the echoed app/recipient and nested reservation evidence.

The response provides the canonical product label, pinned plan version, pool key,
entitlement keys and reservation snapshot, not payer information or token hashes.
Persist its exact reservation/source/pool and authenticated recipient before
explicit activation. Preview makes no write and cannot guarantee later access.
An unassigned full token is a bearer invitation; optional invitee-reference hashes
are metadata, not verified email or club membership authorization. Application
club codes and promotion codes remain separate acquisition mechanisms.

### Recover an uncertain reservation claim

Persist the returned reservation ID in your application before delivering the
invitation. To reconcile a lost claim response, call
`subkit.access.getReservation({ reservationId: reservation.reservationId })`.
This requires `access:read` and a matching service/Core deployment. The SDK
validates the returned app and reservation identity. The service returns a
non-cacheable single-reservation snapshot; it never exposes tokens, token
hashes, invitee-reference hashes or an app-wide reservation list.

For `state: 'claimed'`, `claim` contains the exact `allocationId`, current
`allocationState`, `subjectId` and `claimedAt`. Verify the subject and your
own durable invitation binding before reconciling application membership.
Membership and effective entitlement must still be checked independently.
An inactive allocation must not be treated as permission to create a new one.

A pending reservation past its expiry is reported as `expired` using database
time without a maintenance write. `pending` means only that no claim was
visible in this snapshot, not that an in-flight request failed. Reuse the same
logical claim and idempotency key; do not generate a replacement invitation
from a negative read. Direct and Store sources require their matching
sandbox/production key; environment-neutral sources require a neutral key.

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

SubKit does not perform CPQ, invoicing, tax calculation, or monetary seat
proration. Exact payment retries are idempotent; conflicting amount, currency,
payer, Source, or external identity fails closed.

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

Promotion codes are distinct from invitation tokens. A promotion creates a
commercial Source; an invitation only claims capacity already reserved from an
existing Pool. SubKit hashes and safely stores the submitted code.

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

Manual provision is a privileged, auditable exception for migration or support,
not a shortcut around normal access derivation:

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

All three flows still create the normal Source → Pool → Allocation → Grant path.
They never write an entitlement directly.

## Capacity changes

Preview a capacity change before applying it. The preview evaluates current
used/reserved quantities, effective date, renewal policy, cooldowns, and the
published Plan Version. Apply only the operator-confirmed result with a new
idempotency key and reason.

## Check an entitlement

The app-scoped server key needs the `access:read` capability and a fixed Store
environment. `allowed: false` remains a normal domain result.

```ts compile
const result = await subkit.entitlements.check({ appUserId: 'user_123', entitlement: 'pro' })

if (!result.allowed) {
  // allowed: false is a normal domain result, not an exception
}
```

## Errors

Domain denials (`allowed: false`) are normal results. Network, auth, invalid
response, and non-2xx API responses throw `SubKitApiError`:

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

Sensitive values — bearer tokens, receipts, purchase tokens, raw store payloads
— are never included in SDK errors. Retry only codes marked retryable in the
[error reference](/docs/reference/errors/), using bounded backoff and the same
idempotency key and audit reason for the same mutation.

## Related

- [Commerce](/docs/concepts/commerce/)
- [Access model](/docs/concepts/access-model/)
- [Reference](/docs/reference/overview/)

# @piparotech/subkit-node

Node.js SDK for trusted backend access to SubKit customers, products, offerings, contracts, payments, capacity, reservations, allocations, devices, entitlements, and direct billing.

Never ship a SubKit Server API Key in mobile, browser, Expo, or other untrusted code.

## Install

Install Node from the public npm registry with its required Core peer:

```sh
pnpm add @piparotech/subkit-core@^0.1.11 @piparotech/subkit-node@^0.1.11
```

## Minimal setup

```ts
import { SubKit } from '@piparotech/subkit-node'

const secretKey = process.env.SUBKIT_SECRET_KEY
if (secretKey == null) throw new Error('SUBKIT_SECRET_KEY is required')

const subkit = new SubKit({
  apiBaseUrl: 'https://subkit.piparo.tech',
  appId: 'app_123',
  secretKey,
})

const access = await subkit.entitlements.check({
  appUserId: 'user_123',
  entitlement: 'pro',
})
```

Use an app-scoped `sk_srv_…` key carrying only the required capabilities. Every mutation needs a stable idempotency key and non-empty audit reason. Treat `allowed: false` as a normal domain result.

## Direct billing

Direct billing is intentionally catalog- and Subject-driven. The checkout
request selects an existing Offering/package and includes the app and
beneficiary Subject. For the first Individual slice, the service resolves or
creates the Individual Billing Account from the authenticated active app-user
Subject; the SDK accepts no Billing Account ID, email, or display name for
that selection. The server resolves pricing, currency, provider configuration,
payment methods, and redirect URLs; the SDK accepts no amount, currency,
provider Product/Price ID, payment-method data, or arbitrary success/cancel URL.

```ts
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

// Preserve this value with the displayed view, not a replacement read at click time.
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

Checkout and portal responses contain only SubKit-owned prefixed intent IDs
and short-lived HTTPS redirect URLs with ISO datetime expiry. The summary
contains canonical billing terms and normalized provider-state status, not
provider IDs or payment-method details.

### Account-bound management contract (unreleased)

**BREAKING:** portal creation requires `accountContext`; management and summary
responses require a nullable `accountContext`. This opaque service-generated
SHA-256 context binds the selected account, current ownership period, customer
mapping, app, subject, provider and environment. It is not a credential or a
caller-selected Billing Account ID. The service must reauthorize every call and
refuse a stale context rather than silently selecting another account.

Select the first currently authorized eligible personal account by account
creation time ascending, then account ID ascending, separately per provider and
environment. No account selection UI is required. An owned account without a
subscription has `status: 'none'` and a non-null context; no selected account
has a null context. Missing details or portal configuration must not switch to
another account. Read sandbox and production through separately scoped clients;
never duplicate one summary across environments. Match management and summary
contexts before displaying details and retain the displayed context for the
explicit portal action, including ambiguous retries with the original key.

Management/summary need `direct_billing:read`; portal needs
`direct_billing:write`, with dedicated app/environment credentials. Never widen
an access key. Required release order: matching service contract and migration
plan first, then exact tested Core/Node artifacts and updated consumers. Existing
published versions do not promise this unreleased contract. No legacy unbound
fallback; a historical request without this context cannot safely be replayed
by inventing a new operation key. Release and deployed acceptance remain gated.

Previous opaque App User identities can be linked through
`subkit.customers.addSubjectAlias(...)`. Alias values remain app-scoped identity
data and are represented only by a short hash suffix in Audit/Lifecycle evidence.

Contract lifecycle Preview/Apply is available through `subkit.licenses`. In
addition to suspend/resume/revoke, finite contracts support `renew`,
`schedule_non_renewal`, and `revert_non_renewal`. Apply the preview's state,
auto-renew, and term-end guards; scheduling non-renewal never ends current
access before the term end.

## Organization pool selection

`subkit.checkout.getOrganizationGuestAccess({ purchaseReference, subjectId })`
reads only the exact purchase for its current authorized owner. The response
includes `appId` and `subjectId`, which the SDK validates with the requested
purchase reference. Ready responses provide each pool's `poolId`,
`accessSourceId`, configured key, capacity and entitlement mapping; pending
responses provide no pools. Persist the exact purchase/source/pool binding
before a separately authorized reservation. These IDs do not authorize an
invitee, create a personal entitlement or guarantee capacity at mutation time.
Current service support remains sandbox-only and requires matching artifacts.

## Reservation recovery

`subkit.access.getReservation({ reservationId })` reads one reservation with
`access:read`; an explicit `appId` may override the configured app. The SDK
validates the response's app and reservation identity. The service returns
`Cache-Control: no-store`, checks tenant/app/environment scope and exposes no
token or invitee-reference hashes. Store/direct sources require a matching
sandbox/production key; environment-neutral sources require a neutral key.

A `claimed` result includes the exact allocation ID, current allocation state,
claiming Subject and timestamp. Verify these against your authenticated,
durably bound invitation. It is not proof of effective entitlement or current
application membership. A `pending` result is only a snapshot and must not
trigger a replacement reservation or different claim key after an uncertain
write. The new read requires a matching service deployment and Core artifact;
SDK availability alone does not make it reachable.

### Preview a full invitation token

Use `subkit.access.previewReservation({ claimTokenHash, subjectId })` only on
an authenticated backend, deriving `subjectId` from its session. The POST body
keeps the SHA-256 token hash out of URLs. `access:read` and matching
app/tenant/environment scope are required. Missing tokens, foreign recipients
and claims by another Subject are not disclosed. The SDK validates echoed
app/recipient and the nested reservation binding.

The response contains the current product label, pinned plan version, pool key,
entitlement keys and canonical reservation snapshot. Persist the reviewed
reservation/source/pool and authenticated recipient before a separate explicit
claim. Do not treat preview or allocation state as effective access. Unassigned
full tokens are bearer invitations; optional invitee-reference metadata is not
verified email ownership or application club membership. This API requires a
matching service deployment; mobile clients must not call the Server API.

### Claim the reviewed reservation

`access.claim` requires `reservationId`, `poolId` and `accessSourceId` from the
reviewed preview alongside its token hash and authenticated Subject. This replaces
the old token-only input and capacity-only response. Handle the exact echoed
identity and `status: claimed`/`allocationId` or `status: rejected`/`rejection`.
New claim, audit and completed idempotency result commit atomically. Technical
failures do not become domain rejection. Reuse the original payload/key after
request loss; old processing/failed journals require independent reconciliation.
Effective access and application membership remain separate checks. Update all
callers and service artifacts together; no token-only compatibility path exists.

After response loss, `access.readReservationClaim({ ...originalRequest,
idempotencyKey })` reads the exact operation with `access:read` and no mutation.
The request hash includes the original reason and reviewed identity. Completed
results replay unchanged; absent/processing/historical failed journals return
`pending`. A claimed reservation alone does not identify the claiming operation.
After confirmed completion use `getReservation` for current exact allocation
state, then the canonical entitlement decision for current access.

## Managed invitation codes (unreleased)

`subkit.invitations` requires a matching service release. SDK publication alone
never enables the API. Existing caller-generated reservation tokens remain
supported. Managed codes claim canonical reservations, not promotions, login
credentials or independent licenses.

Configure one default format per app:

```ts
const current = await subkit.invitations.getFormat()
await subkit.invitations.updateFormat(
  {
    expectedRevision: current.revision,
    format: {
      prefix: 'CLUB-',
      randomLength: 8,
      alphabet: 'unambiguous-uppercase',
      groupSize: 4,
    },
    reason: 'Configure team invitation codes',
  },
  { idempotencyKey: formatOperationId },
)
```

An unconfigured app returns revision zero and null format. Prefixes are optional
uppercase ASCII labels ending in `-`, never access authority. The random body
has 8 to 32 characters; grouping may be null. Issued formats are immutable, so
changing settings does not invalidate existing invitations.

Issue and deliver only after checking product administration rights:

```ts
const invitation = await subkit.invitations.issue(
  {
    poolId,
    recipient: { kind: 'subject', subjectId: invitedSubjectId },
    reason: 'Invite team member',
  },
  { idempotencyKey: issueOperationId },
)
```

Add `recipientDisplay: { email, name }` to show the invitee in your management UI
later. SubKit encrypts it separately from the matching fingerprint; it never
authorizes a claim.

For unregistered recipients, use `{ kind: 'reference', reference }`. Your backend
must independently verify that reference against the signed-in identity before
preview/claim. Never trust identity or reference fields supplied by a browser or
mobile client. Treat references as sensitive; SubKit stores protected fingerprints,
not a second email-verification authority.

The response includes reservation/source/pool identity, reserved `quantity`,
`codeVersion`, formatted `code`, immutable `format` and `formatRevision`, environment
and finite UTC ISO expiry. The SDK checks issued quantity, initial code version
and an explicitly requested expiry. A null environment denotes environmentless
management scope, never production. Persist the original
operation and identity before mail delivery. Retry an uncertain issue with the
same payload/key, not a second reservation. Expiry is bounded by the source/pool
and reservation policy. Neither resend nor rotation extends it.

`getDelivery({ ...identity, expectedCodeVersion, reason }, { idempotencyKey })`
returns the current pending credential through an audited, separately authorized
POST. `rotateCode` takes the same inputs and replaces the code on that reservation;
the old code becomes invalid. It preserves format, expiry and capacity and cannot
reopen terminal invitations. Withdraw pending invitations through
`access.revokeReservation`; claimed access is released through allocations.

```ts
const preview = await subkit.invitations.preview({
  code: submittedCode,
  subjectId: authenticatedSubjectId,
  verifiedRecipientReference,
})
const claimRequest = {
  appId: preview.appId,
  subjectId: authenticatedSubjectId,
  reservationId: preview.reservation.reservationId,
  poolId: preview.reservation.poolId,
  accessSourceId: preview.reservation.accessSourceId,
  codeVersion: preview.codeVersion,
  code: submittedCode,
  verifiedRecipientReference,
  reason: 'Recipient accepted reviewed invitation',
}
const result = await subkit.invitations.claim(claimRequest, {
  idempotencyKey: claimOperationId,
})
```

`preview.organizationSubjectId` names the source's current organization licensee
(null when none), so your backend can map the code to its own team or club
without storing invitation facts.

Persist the reviewed claim before sending it. After transport uncertainty,
`getClaimStatus({ ...claimRequest, idempotencyKey: claimOperationId })` reads
exactly that operation. Each result retains the reviewed `codeVersion`; the SDK
rejects another version. A fully bound claim of an expired, already used or
withdrawn invitation returns `status: 'rejected'` with `expired`, `used` or
`unavailable`; that exact outcome is recoverable too. Wrong codes, versions or
recipients fail without a receipt. `pending` is not failure. Resume local membership
completion from the confirmed allocation, never reserve again, then refresh
effective access. Historical success does not prove current entitlement.

### Organization pools and invitation lists

`access.listOrganizationPools({ organizationSubjectId, limit, cursor })` returns
one page (default 50, maximum 100) of the pools held by the organization's current
licensee, with `checkedAt`, UTC ISO validity and numeric usage. It never names a
payer or member. Follow `nextCursor` until it is null before deciding; a partial
page proves neither absence nor uniqueness. Pick a pool by your own explicit rule
and refuse when none or several match. Usage is an observation, not a reservation.

`invitations.listForOrganization({ organizationSubjectId, limit, cursor })` pages
the organization's managed invitations newest first with state, expiry, code
version and display data. It never returns codes.

Required capabilities: format read/write use `catalog:read/write`; organization
pools, preview and
claim-status use `access:read`; claim/revoke use `access:write`. Issue/rotate need
both `access:write` and `invitations:deliver`; delivery needs
`invitations:deliver`; invitation lists need `access:read` and
`invitations:deliver`. All enforce tenant/app/canonical source environment; no
public SDK key is accepted. The new client refuses explicit app overrides that
conflict with its configured app.

Codes travel in POST bodies, are encrypted at rest and absent from ordinary
reads. Keep codes and recipient references out of logs, URLs and analytics.
Respect distributed attempt limits and `429` responses. A lost response must
never trigger an automatic replacement operation.

## Documentation

- [Node backend guide](https://subkit.piparo.tech/docs/node/overview/)
- [HTTP and SDK reference](https://subkit.piparo.tech/docs/reference/api/)
- [Capabilities and errors](https://subkit.piparo.tech/docs/reference/errors/)
- [Security](https://subkit.piparo.tech/docs/operations/security/)

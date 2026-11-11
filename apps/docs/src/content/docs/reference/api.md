---
title: HTTP API
sidebar:
  label: HTTP API
description: Runtime and Server endpoint inventory, authentication boundaries, capabilities, and mutation headers.
---

SubKit exposes JSON `POST` endpoints under `/api/runtime/**` and `/api/server/**`.
Use the SDKs when possible: `@piparotech/subkit-expo` wraps Runtime endpoints and
`@piparotech/subkit-node` wraps Server endpoints. The Zod request/response schemas
live in `@piparotech/subkit-core` and are the normative contract.

## Common headers

```http
Authorization: Bearer <key>
Content-Type: application/json
```

Server mutations also require:

```http
Idempotency-Key: stable-operation-key
```

Mutation bodies carry a non-empty `reason`. SubKit records the acting key,
reason, and before/after evidence. Do not place keys or raw provider evidence in
the reason or idempotency key.

## Runtime API

Runtime requests use a public app-bound `sk_sdk_…` key. The caller cannot select
an app or Store environment; the key resolves the app and verified provider
evidence resolves the environment.

| Endpoint                                  | Purpose                                                    |
| ----------------------------------------- | ---------------------------------------------------------- |
| `/api/runtime/offerings`                  | Runtime packages and current offering                      |
| `/api/runtime/customer-info`              | Effective entitlements and access context                  |
| `/api/runtime/entitlements/check`         | One fail-closed entitlement decision                       |
| `/api/runtime/iap/reconcile`              | Provider-verified purchase reconciliation (202 + job poll) |
| `/api/runtime/iap/reconcile/$reconcileId` | Poll a durable reconcile job (pending/result, stable id)   |
| `/api/runtime/devices/list`               | Installation/device activation state                       |
| `/api/runtime/devices/claim`              | Claim an eligible activation                               |
| `/api/runtime/devices/renew`              | Renew the current activation lease                         |
| `/api/runtime/devices/replace`            | Replace an activation within policy                        |
| `/api/runtime/devices/revoke`             | Revoke a selected activation                               |

Only provider verification followed by a `granted` Effective Access decision
unlocks a mobile feature. A successful purchase transport response or one raw
CustomerInfo field is not authority by itself.

The Expo decision surface is:

```ts compile
const detailed = await client.getAccess('pro')
const allowed = await client.hasAccess('pro')
```

`detailed` is a discriminated union; `device_blocked` requires a typed recovery
reason, while `granted` cannot carry one. Raw `/customer-info` remains available
for diagnostics and advanced recovery UI.

## Server API reads

Server requests use an app-scoped `sk_srv_…` key with the listed capability.

| Endpoint                             | Capability            |
| ------------------------------------ | --------------------- |
| `/api/server/offerings`              | `catalog:read`        |
| `/api/server/products`               | `catalog:read`        |
| `/api/server/contract-plan-versions` | `catalog:read`        |
| `/api/server/customer-info`          | `access:read`         |
| `/api/server/entitlements/check`     | `access:read`         |
| `/api/server/licenses`               | `access:read`         |
| `/api/server/licenses/:sourceId`     | `access:read`         |
| `/api/server/access-pools/:poolId`   | `access:read`         |
| `/api/server/devices`                | `access:read`         |
| `/api/server/direct-billing/summary` | `direct_billing:read` |
| `/api/server/billing/by-app-reference/:reference` | `billing:read` |
| `/api/server/billing-documents/:documentId/file` | `billing:read` |

`allowed: false` is a normal domain response, not an HTTP error.

`POST /api/server/access-reservations/claim` requires `access:write`, the reviewed
`reservationId`, `poolId`, `accessSourceId`, app, authenticated Subject, token hash
and audit reason. It returns an identity-bound claimed allocation or durable typed
rejection, not capacity usage. New result/audit/claim commit together. Retry the
same payload/key after uncertainty; do not infer effective access from completion.

`POST /api/server/access-reservations/claim/status` requires `access:read` and
the exact original claim body plus `idempotencyKey`. It performs no mutation and
returns the original claimed/rejected result or `pending`. Tenant, app, source
environment, reviewed identity and full request hash are checked. Missing or
historical processing/failed journals remain uncertain. Token hash and key stay
in the POST body, are not returned, and all responses use `Cache-Control: no-store`.

`POST /api/server/access-reservations/preview` requires `access:read` and accepts
`{ appId, claimTokenHash, subjectId }` from an authenticated application backend.
It returns a non-cacheable recipient-scoped reservation snapshot with product,
pinned plan, pool and entitlement labels. It rejects foreign assignment/claimant
without disclosing the reservation. The token hash stays in the body and is never
returned. No write, effective entitlement or application membership is implied;
unassigned full tokens remain bearer invitations. See
`subkit.access.previewReservation` and the [preview guide](/docs/node/overview/#preview-before-explicit-activation).

`GET /api/server/access-reservations/:reservationId?appId=...` additionally
provides an `access:read`-protected, non-cacheable reservation snapshot. It
checks tenant, app and source environment and returns canonical state plus an
exact claim/allocation reference when claimed. It does not expose token or
invitee-reference hashes, authorize an invitee or grant entitlement. See
`serverReservationReadRequestSchema`, `serverReservationReadResponseSchema`
and the [reservation recovery guide](/docs/node/overview/#recover-an-uncertain-reservation-claim).
The route requires a matching service deployment; it is not a Runtime API.

## Server API mutations

| Endpoint                                                       | Capability                |
| -------------------------------------------------------------- | ------------------------- |
| `/api/server/subjects/upsert`                                  | `subjects:write`          |
| `/api/server/subjects/:subjectId/aliases`                      | `subjects:write`          |
| `/api/server/organizations/:organizationSubjectId/memberships` | `organizations:write`     |
| `/api/server/billing-accounts`                                 | `billing_accounts:write`  |
| `/api/server/contracts`                                        | `contracts:write`         |
| `/api/server/contracts/:sourceId/licensee`                     | `contracts:write`         |
| `/api/server/contracts/:sourceId/lifecycle`                    | `access:write`            |
| `/api/server/payments`                                         | `payments:write`          |
| `/api/server/free-enrollments`                                 | `access:write`            |
| `/api/server/manual-provisions`                                | `manual_provisions:write` |
| `/api/server/promotion-codes/redeem`                           | `promotions:redeem`       |
| `/api/server/access-pools/:poolId`                             | `access:write`            |
| `/api/server/access-pools/:poolId/reservations`                | `access:write`            |
| `/api/server/access-pools/:poolId/allocations`                 | `access:write`            |
| `/api/server/access-reservations/claim`                        | `access:write`            |
| `/api/server/access-reservations/:reservationId`               | `access:write`            |
| `/api/server/access-allocations/:allocationId`                 | `access:write`            |
| `/api/server/devices/:activationId`                            | `access:write`            |
| `/api/server/devices/budget-reset`                             | `access:write`            |
| `/api/server/plan-versions/:planVersionId`                     | `catalog:write`           |
| `/api/server/sdk-keys`                                         | `sdk_keys:write`          |
| `/api/server/direct-checkout/sessions`                         | `direct_billing:write`    |
| `/api/server/billing-portal/sessions`                          | `direct_billing:write`    |
| `/api/server/mails`                                            | `mail:send`               |
| `/api/server/mail-suppressions`                                | `mail:send`               |

There is no direct grant-write endpoint. Mutations create or change verified
sources, pools, reservations, allocations, or device activations; grants remain
derived.

### Hosted direct billing

The direct billing surface is for trusted server code. It accepts an app-bound
Subject identity and published catalog selections, then returns only
service-owned opaque intents and short-lived redirects. For the first
Individual slice, the service owns Billing Account selection: it resolves or
creates the Individual Billing Account from the authenticated active app-user
Subject. The public client contract does not accept an account ID, email, or
display name for this selection.

| Endpoint                               | Purpose                                                   |
| -------------------------------------- | --------------------------------------------------------- |
| `/api/server/direct-checkout/sessions` | Create a hosted checkout session from an Offering/package |
| `/api/server/billing-portal/sessions`  | Create a hosted billing portal session                    |
| `/api/server/direct-billing/summary`   | Read the canonical direct billing summary                 |

`POST /api/server/direct-checkout/sessions` accepts
`offeringIdentifier` and `packageIdentifier`, plus `subjectId` and an optional
allowlisted `returnTarget`. It does **not** accept a Billing Account ID, amount,
currency, Stripe Product/Price IDs, payment-method data, or caller-controlled
success/cancel URLs. The service resolves the Individual Billing Account from
the authenticated active app-user Subject, then resolves the remaining values
from its app configuration and published catalog.

```json
{
  "appId": "app_123",
  "offeringIdentifier": "default",
  "packageIdentifier": "monthly",
  "reason": "start selected direct billing checkout",
  "returnTarget": "billing_settings",
  "subjectId": "subject_123"
}
```

Checkout and portal responses contain a SubKit-owned intent ID with the
`checkout-intent:` or `billing-portal:` prefix, a short-lived HTTPS
`redirectUrl`, and an ISO datetime `redirectUrlExpiresAt`. They never contain
provider IDs, client secrets, or payment-method details. The summary response
contains only canonical catalog, amount/currency, period, cancellation, and
provider-state status fields. Status values are normalized at the service's
provider integration boundary; they are not provider commands. The normative
Zod contracts are exported by `@piparotech/subkit-core` as
`serverDirectCheckoutSessionRequestSchema`,
`serverDirectCheckoutSessionResponseSchema`,
`serverBillingPortalSessionRequestSchema`,
`serverBillingPortalSessionResponseSchema`,
`serverDirectBillingSummaryRequestSchema`, and
`serverDirectBillingSummaryResponseSchema`.

### Link a previous Subject identity

`POST /api/server/subjects/:subjectId/aliases` links one previous opaque runtime
identifier to the existing Subject. It requires an app-scoped `subjects:write`
key, a reason, and `Idempotency-Key`.

```json
{
  "alias": "previous-opaque-app-user-id",
  "appId": "app_123",
  "reason": "link identity after account migration"
}
```

Aliases are unique per app and cannot be moved between Subjects. The raw alias
remains in the identity table so Runtime resolution works, but audit and
lifecycle evidence contain only a short hash suffix. The mutation writes the
Alias, operator audit, and `subject_alias_added` event atomically. The Node
client exposes it as `subkit.customers.addSubjectAlias(...)`.

### Manage Organization Memberships and roles

`POST /api/server/organizations/:organizationSubjectId/memberships` starts one
app-scoped membership for an existing App User. `PATCH` assigns or ends an
`admin`/`trainer` role, or ends the membership. Both methods require
`organizations:write`, a non-empty reason, an authoritative `effectiveAt`, and
`Idempotency-Key`.

```json
{
  "appId": "app_123",
  "effectiveAt": "2026-08-01T00:00:00.000Z",
  "memberSubjectId": "subject_trainer_456",
  "reason": "trainer joined the club roster",
  "roles": ["trainer"]
}
```

Membership, operator Audit, and lifecycle evidence commit atomically. Membership
and roles are historical identity/governance evidence only: they allocate no
seat and grant no entitlement. Seats remain authoritative through
Reservation/Allocation; the Organization detail view displays both authorities
separately. The Node client exposes
`subkit.customers.startOrganizationMembership(...)` and
`subkit.customers.mutateOrganizationMembership(...)`.

### Change a Contract licensee

`PATCH /api/server/contracts/:sourceId/licensee` changes the current historical
organization-licensee relationship for one Contract Source. It requires
`contracts:write`, an app-scoped Server key, and `Idempotency-Key`.

```json
{
  "appId": "app_123",
  "effectiveAt": "2026-08-01T00:00:00.000Z",
  "licenseeSubjectId": "subject_club_456",
  "reason": "club legal entity changed"
}
```

The target must be an `organization` Access Subject in the same app. The
effective time must follow the current licensee period. SubKit closes the old
period, creates the new one, writes operator audit evidence, and records one
`licensee_changed` lifecycle event in the same transaction. This relationship
does not allocate a seat or grant an entitlement. The Node client exposes the
same contract as `subkit.contracts.changeLicensee(input, { idempotencyKey })`.

### Change Contract lifecycle or renewal intent

Use `POST /api/server/contracts/:sourceId/lifecycle` for a read-only preview and
`PATCH` with `Idempotency-Key` for Apply. Supported actions are `suspend`,
`resume`, `revoke`, `renew`, `schedule_non_renewal`, and
`revert_non_renewal`. Apply always repeats the preview guards
`expectedState`, optional `expectedAutoRenews`, and optional `expectedTermEnd`.
`renew` additionally requires a strictly later `newTermEnd`.

```json
{
  "action": "schedule_non_renewal",
  "appId": "app_123",
  "expectedAutoRenews": true,
  "expectedState": "active",
  "expectedTermEnd": "2027-08-01T00:00:00.000Z",
  "reason": "customer requested cancellation at term end"
}
```

Scheduling non-renewal changes only renewal intent. It does not suspend,
revoke, or shorten current access. Reverting the schedule remains a separate
lifecycle event. Renewal extends Contract and source-bound validity windows in
one transaction and records operator audit plus `contract_renewed` evidence.
The Node client exposes preview/apply through `subkit.licenses`.

## Billing reads and mails

An app's own service calls these routes with an app-scoped server key
(`sk_srv_…`, one per app and environment). The key decides app and environment;
`test` is the sandbox key, `live` the production key. A key of another app, a
tenant-wide key, or a key without the capability gets `403`. Every answer
carries `Cache-Control: no-store, private`. Amounts are gross minor units
(cents), days are calendar days in Europe/Berlin. The capabilities are
`billing:read` (group `billing`) and `mail:send` (group `mail`). These routes
take no `reason`.

### Read billing by app reference

`GET /api/server/billing/by-app-reference/:reference?appId=...` requires
`billing:read`. It returns the purchases, auto-renewal, and billing documents of
one app reference, for example a license ID: a purchase whose `purchase.paid`
event the app answered with this `reference`, a purchase whose checkout named it
as `appReference` (an update year), the subscriptions of those purchases or
answered with it, and the documents of all of them. Nothing of another app or
environment is returned, and no name, address, or card. An unknown reference
answers empty lists.

```json
{
  "appReference": "LIC-1",
  "purchases": [
    {
      "purchaseRef": "checkout-intent:…",
      "amount": 3900,
      "currency": "EUR",
      "paidAt": "2026-11-10T23:30:00.000Z",
      "provisionOn": "2026-11-25",
      "state": "normal",
      "subscriptionRef": "checkout-intent:…"
    }
  ],
  "subscriptions": [
    {
      "subscriptionRef": "checkout-intent:…",
      "status": "active",
      "autoRenew": true,
      "currentPeriodEnd": "2027-11-10T23:30:00.000Z"
    }
  ],
  "documents": [
    {
      "id": "…",
      "kind": "invoice",
      "number": "RE-0042",
      "amount": 3900,
      "currency": "EUR",
      "issuedOn": "2026-11-11",
      "file": true
    }
  ]
}
```

`state` is `normal`, `refunded`, `partially_refunded`, `dispute_pending`, or
`dispute_lost`. `kind` is `invoice` or `creditNote`. `file` says whether the PDF
is archived.

### Download a billing document

`GET /api/server/billing-documents/:documentId/file?appId=...` requires
`billing:read`. It returns the archived PDF (`application/pdf`) as an attachment
named after the document number. A document of another app or environment, an
unknown one, or one without an archived file is `404`.

### Send a mail

`POST /api/server/mails` requires `mail:send` and the `Idempotency-Key` header
(8 to 200 characters). The body follows the app's mail source:

- `pack`: `{ appId, to, template, data, attachments? }`. `template` is a free
  template of the app's pack. An occasion (`purchase.completed` and the other
  money mails SubKit requests itself) and an unknown template are refused, and
  `data` must render.
- `app`: the finished mail `{ appId, to, subject, html, text, category, attachments? }`.
  `subject` is one line of at most 200 characters, `html` and `text` are not
  empty and at most 120 KiB together, and `category` is `transactional` or
  `reminder`.

A body of the other source is refused. A `reminder` carries the placeholder
`https://unsubscribe.subkit.invalid/` in `html` and in `text`. SubKit replaces
it when sending with the unsubscribe address and its token and sets
`List-Unsubscribe` and `List-Unsubscribe-Post`. A reminder without the
placeholder is refused, and a `transactional` mail is sent as given. SubKit
rewrites nothing else.

`attachments` are at most ten `{ filename, contentType, content }` with
`content` as Base64, at most 256 KiB together after decoding.

Answers, all `200`:

- `{ "status": "queued", "jobId": "…" }`: the mail is in the queue.
- `{ "status": "suppressed" }`: the address unsubscribed from reminders, and no
  job is created. Transactional mails are never suppressed.

The same key with the same body answers the same and queues nothing twice. With
another body it is `409 idempotency_conflict`. At most ten mails per recipient
and hour per app are accepted, counted once per key. The eleventh is
`429 rate_limited` with `details.retryAfterSeconds`, and the same key may be
retried later. A refused body is `400 validation_failed` with `details.reason`:
`invalid_json`, `invalid_body`, `body_of_other_source`, `occasion`,
`template_unknown`, `data_invalid`, `render_failed`,
`unsubscribe_placeholder_missing`, or `attachments_too_large`. An app and
environment without mail settings is `409 not_ready`.

### Record an unsubscribe

`POST /api/server/mail-suppressions` requires `mail:send`. The body is
`{ appId, token, source }` with the token from the unsubscribe link of a
reminder and `source` either `link` (the page) or `oneClick` (the
`List-Unsubscribe-Post` request). It answers `200` with `{ "result": … }`:
`unsubscribed` (also for a token used before), `expired`, or `unknown`. Only
reminders stop; transactional mails keep arriving.

## Example

```sh
curl -X POST https://subkit.piparo.tech/api/server/entitlements/check \
  -H "Authorization: Bearer $SUBKIT_SERVER_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"appUserId":"user_123","entitlement":"pro"}'
```

For mutation examples, use the [Node.js backend guide](/docs/node/overview/).

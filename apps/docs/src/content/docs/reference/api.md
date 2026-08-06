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

| Endpoint                             | Capability     |
| ------------------------------------ | -------------- |
| `/api/server/offerings`              | `catalog:read` |
| `/api/server/products`               | `catalog:read` |
| `/api/server/contract-plan-versions` | `catalog:read` |
| `/api/server/customer-info`          | `access:read`  |
| `/api/server/entitlements/check`     | `access:read`  |
| `/api/server/licenses`               | `access:read`  |
| `/api/server/licenses/:sourceId`     | `access:read`  |
| `/api/server/access-pools/:poolId`   | `access:read`  |
| `/api/server/devices`                | `access:read`  |

`allowed: false` is a normal domain response, not an HTTP error.

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

There is no direct grant-write endpoint. Mutations create or change verified
sources, pools, reservations, allocations, or device activations; grants remain
derived.

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

## Example

```sh
curl -X POST https://subkit.piparo.tech/api/server/entitlements/check \
  -H "Authorization: Bearer $SUBKIT_SERVER_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"appUserId":"user_123","entitlement":"pro"}'
```

For mutation examples, use the [Node.js backend guide](/docs/node/overview/).

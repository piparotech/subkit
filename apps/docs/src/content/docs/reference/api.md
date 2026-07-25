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

| Endpoint                          | Purpose                                   |
| --------------------------------- | ----------------------------------------- |
| `/api/runtime/offerings`          | Runtime packages and current offering     |
| `/api/runtime/customer-info`      | Effective entitlements and access context |
| `/api/runtime/entitlements/check` | One fail-closed entitlement decision      |
| `/api/runtime/iap/reconcile`      | Provider-verified purchase reconciliation |
| `/api/runtime/devices/list`       | Installation/device activation state      |
| `/api/runtime/devices/claim`      | Claim an eligible activation              |
| `/api/runtime/devices/renew`      | Renew the current activation lease        |
| `/api/runtime/devices/replace`    | Replace an activation within policy       |
| `/api/runtime/devices/revoke`     | Revoke a selected activation              |

Only provider verification and effective entitlement state unlock access. A
successful purchase transport response is not authority by itself.

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

| Endpoint                                         | Capability                |
| ------------------------------------------------ | ------------------------- |
| `/api/server/subjects/upsert`                    | `subjects:write`          |
| `/api/server/billing-accounts`                   | `billing_accounts:write`  |
| `/api/server/contracts`                          | `contracts:write`         |
| `/api/server/contracts/:sourceId/lifecycle`      | `access:write`            |
| `/api/server/payments`                           | `payments:write`          |
| `/api/server/free-enrollments`                   | `access:write`            |
| `/api/server/manual-provisions`                  | `manual_provisions:write` |
| `/api/server/promotion-codes/redeem`             | `promotions:redeem`       |
| `/api/server/access-pools/:poolId`               | `access:write`            |
| `/api/server/access-pools/:poolId/reservations`  | `access:write`            |
| `/api/server/access-pools/:poolId/allocations`   | `access:write`            |
| `/api/server/access-reservations/claim`          | `access:write`            |
| `/api/server/access-reservations/:reservationId` | `access:write`            |
| `/api/server/access-allocations/:allocationId`   | `access:write`            |
| `/api/server/devices/:activationId`              | `access:write`            |
| `/api/server/devices/budget-reset`               | `access:write`            |
| `/api/server/plan-versions/:planVersionId`       | `catalog:write`           |
| `/api/server/sdk-keys`                           | `sdk_keys:write`          |

There is no direct grant-write endpoint. Mutations create or change verified
sources, pools, reservations, allocations, or device activations; grants remain
derived.

## Example

```sh
curl -X POST https://subkit.piparo.tech/api/server/entitlements/check \
  -H "Authorization: Bearer $SUBKIT_SERVER_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"appUserId":"user_123","entitlement":"pro"}'
```

For mutation examples, use the [Node.js backend guide](/docs/node/overview/).

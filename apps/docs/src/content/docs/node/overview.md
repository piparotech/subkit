---
title: Node.js backend
description: Drive SubKit commerce and access from trusted server code — customers, contracts, payments, seats, entitlement checks, idempotency, and errors.
---

The `@piparotech/subkit-node` SDK is for trusted server-to-server code only. It
carries a scoped server key (`sk_srv_…`) that can mutate commerce and access.
Never ship this key in mobile apps, web clients, or Expo bundles.

## Install and configure

```sh
pnpm add @piparotech/subkit-core@^0.1.8 @piparotech/subkit-node@^0.1.8
```

```ts
import { SubKit } from '@piparotech/subkit-node'

const subkit = new SubKit({
  apiBaseUrl: 'https://subkit.example.com',
  secretKey: process.env.SUBKIT_SECRET_KEY,
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

Exact retries with the same idempotency key are safe; conflicting evidence fails
closed.

## Customers and access subjects

```ts
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

```ts
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

```ts
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

## Record verified payment evidence

A Contract creates a Source and Pools; it does not claim money moved. Record a
separately verified PSP, settlement, or invoice event with `payments:write`:

```ts
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

## Other access sources

Free enrollment, promotion redemption, and manual provision all use the normal
Source → Pool → Allocation → Grant path. They are not direct entitlement writes.
Promotion codes are distinct from invitation tokens: a promotion creates a
commercial Source; an invitation claims already reserved pool capacity.

## Capacity changes

Preview a capacity change before applying it. The preview evaluates current
used/reserved quantities, effective date, renewal policy, cooldowns, and the
published Plan Version. Apply only the operator-confirmed result with a new
idempotency key and reason.

## Check an entitlement

```ts
const result = await subkit.entitlements.check({ appUserId: 'user_123', entitlement: 'pro' })

if (!result.allowed) {
  // allowed: false is a normal domain result, not an exception
}
```

## Errors

Domain denials (`allowed: false`) are normal results. Network, auth, invalid
response, and non-2xx API responses throw `SubKitApiError`:

```ts
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
idempotency key for the same mutation.

## Related

- [Commerce](/docs/concepts/commerce/)
- [Access model](/docs/concepts/access-model/)
- [Reference](/docs/reference/overview/)

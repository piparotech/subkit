# @piparotech/subkit-node

Node.js backend SDK for server-to-server SubKit queries.

This package is for trusted backend code only. Do not ship its `secretKey` in mobile apps, web clients, Expo bundles, or other untrusted environments.

## Install

```sh
pnpm add @piparotech/subkit-node
```

## Configure

```ts
import { SubKit } from '@piparotech/subkit-node'

const subkit = new SubKit({
  apiBaseUrl: 'https://subkit.example.com',
  secretKey: process.env.SUBKIT_SECRET_KEY!,
  appId: 'app_123',
})
```

Use a server-side secret such as `subkit_server_live_...`. Public/mobile SDK keys are intentionally out of scope for this package.

## Create customers and contracts

Every mutation requires an explicit idempotency key.

```ts
const subject = await subkit.customers.upsertSubject(
  { externalId: 'trainer_123', kind: 'app_user' },
  { idempotencyKey: 'subject:trainer_123' },
)

const club = await subkit.customers.createBillingAccount(
  { displayName: 'FC Example', externalId: 'club_123', kind: 'organization' },
  { idempotencyKey: 'billing-account:club_123' },
)

const contract = await subkit.contracts.create(
  {
    billingAccountId: club.id,
    externalContractId: 'contract_123',
    planVersionId: 'plan-version_123',
    termStart: new Date('2027-01-01T00:00:00Z'),
  },
  { idempotencyKey: 'contract:contract_123' },
)
```

## Enroll free access

Free access is still server-verified and follows the normal Source → Pool → Allocation → Grant path. Eligibility comes from the published Plan Version, not from caller input.

```ts
const enrollment = await subkit.access.enrollFree(
  { planVersionId: 'plan-version_basis', subjectId: subject.id },
  { idempotencyKey: 'free-enrollment:trainer_123' },
)
```

## Reserve and allocate access

```ts
const reservation = await subkit.access.reserve(
  {
    poolId: contract.poolIds[0],
    claimTokenHash: securelyHashInvitationToken(invitationToken),
  },
  { idempotencyKey: 'invite:trainer_123' },
)

const allocation = await subkit.access.claim(
  {
    claimTokenHash: securelyHashInvitationToken(invitationToken),
    subjectId: subject.id,
  },
  { idempotencyKey: 'claim:trainer_123' },
)

console.log(allocation.capacity, allocation.used, allocation.available)
```

Invitation tokens stay outside SubKit storage; send the opaque token to the invitee and submit only its hash to SubKit.

## Check an entitlement

```ts
const result = await subkit.entitlements.check({
  appUserId: 'user_123',
  entitlement: 'pro',
})

if (!result.allowed) {
  throw new Error(`Missing entitlement: ${result.reason}`)
}
```

`allowed: false` is a normal domain result, not an exception. Network failures, auth failures, invalid responses, and non-2xx API responses throw `SubKitApiError`.

## Read customer info

```ts
const customerInfo = await subkit.customers.getCustomerInfo({
  appUserId: 'user_123',
})
```

## List offerings

```ts
const offerings = await subkit.offerings.list({
  placement: 'settings_upgrade',
  platform: 'ios',
})
```

## List products

```ts
const products = await subkit.products.list({
  entitlement: 'pro',
})
```

## Explicit app id per request

If no default `appId` is configured, pass it per request:

```ts
await subkit.entitlements.check({
  appId: 'app_123',
  appUserId: 'user_123',
  entitlement: 'pro',
})
```

## Errors

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

Sensitive values such as bearer tokens, receipts, purchase tokens, and raw store payloads are not included in SDK-generated errors.

## Request options

```ts
await subkit.entitlements.check(
  { appUserId: 'user_123', entitlement: 'pro' },
  { timeoutMs: 5_000, idempotencyKey: 'optional-idempotency-key' },
)
```

## Backend endpoints

The SDK calls server-authenticated SubKit endpoints for:

- subjects and billing accounts
- contracts and manual provisions
- reservations, claims, allocations, and pool/allocation lifecycle actions
- entitlement checks and customer info
- offerings and products

Use a SubKit-issued `sk_srv_…` key scoped to the target app and required capabilities. SubKit stores only its hash; there is no global server API environment key.

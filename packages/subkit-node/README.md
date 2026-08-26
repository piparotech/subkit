# @piparotech/subkit-node

Node.js SDK for trusted backend access to SubKit customers, products, offerings, contracts, payments, capacity, reservations, allocations, devices, entitlements, and direct billing.

Never ship a SubKit Server API Key in mobile, browser, Expo, or other untrusted code.

## Install

Configure the private GitHub Packages registry, then install Node with its required Core peer:

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

Direct billing is intentionally catalog- and ownership-driven. The checkout
request selects an existing Offering/package and includes the app, billing
account, and beneficiary Subject. The server resolves pricing, currency,
provider configuration, payment methods, and redirect URLs; the SDK accepts no
amount, currency, provider Product/Price ID, payment-method data, or arbitrary
success/cancel URL.

```ts
const checkout = await subkit.checkout.createSession(
  {
    billingAccountId: 'billing_account_123',
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
    billingAccountId: 'billing_account_123',
    reason: 'open billing settings',
    subjectId: 'subject_123',
  },
  { idempotencyKey: 'portal:subject_123' },
)

const summary = await subkit.billing.getSummary({
  billingAccountId: 'billing_account_123',
  subjectId: 'subject_123',
})
```

Checkout and portal responses contain only opaque intent IDs and short-lived
redirect URLs with their expiry. The summary contains canonical billing terms
and status, not provider IDs or payment-method details.

Previous opaque App User identities can be linked through
`subkit.customers.addSubjectAlias(...)`. Alias values remain app-scoped identity
data and are represented only by a short hash suffix in Audit/Lifecycle evidence.

Contract lifecycle Preview/Apply is available through `subkit.licenses`. In
addition to suspend/resume/revoke, finite contracts support `renew`,
`schedule_non_renewal`, and `revert_non_renewal`. Apply the preview's state,
auto-renew, and term-end guards; scheduling non-renewal never ends current
access before the term end.

## Documentation

- [Node backend guide](https://subkit.piparo.tech/docs/node/overview/)
- [HTTP and SDK reference](https://subkit.piparo.tech/docs/reference/api/)
- [Capabilities and errors](https://subkit.piparo.tech/docs/reference/errors/)
- [Security](https://subkit.piparo.tech/docs/operations/security/)

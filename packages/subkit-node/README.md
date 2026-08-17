# @piparotech/subkit-node

Node.js SDK for trusted backend access to SubKit customers, products, offerings, contracts, payments, capacity, reservations, allocations, devices, and entitlements.

Never ship a SubKit Server API Key in mobile, browser, Expo, or other untrusted code.

## Install

Configure the private GitHub Packages registry, then install Node with its required Core peer:

```sh
pnpm add @piparotech/subkit-core@^0.1.9 @piparotech/subkit-node@^0.1.9
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

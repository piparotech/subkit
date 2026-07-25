# @piparotech/subkit-node

Node.js SDK for trusted backend access to SubKit customers, products, offerings, contracts, payments, capacity, reservations, allocations, devices, and entitlements.

Never ship a SubKit Server API Key in mobile, browser, Expo, or other untrusted code.

## Install

Configure the private piparo.tech Forgejo registry, then install Node with its required Core peer:

```sh
pnpm add @piparotech/subkit-core@^0.1.8 @piparotech/subkit-node@^0.1.8
```

## Minimal setup

```ts
import { SubKit } from '@piparotech/subkit-node'

const subkit = new SubKit({
  apiBaseUrl: 'https://subkit.piparo.tech',
  appId: 'app_123',
  secretKey: process.env.SUBKIT_SECRET_KEY!,
})

const access = await subkit.entitlements.check({
  appUserId: 'user_123',
  entitlement: 'pro',
})
```

Use an app-scoped `sk_srv_…` key carrying only the required capabilities. Every mutation needs a stable idempotency key and non-empty audit reason. Treat `allowed: false` as a normal domain result.

## Documentation

- [Node backend guide](https://subkit.piparo.tech/docs/node/overview/)
- [HTTP and SDK reference](https://subkit.piparo.tech/docs/reference/api/)
- [Capabilities and errors](https://subkit.piparo.tech/docs/reference/errors/)
- [Security](https://subkit.piparo.tech/docs/operations/security/)

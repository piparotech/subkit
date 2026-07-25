---
title: Error handling
description: Domain results vs. thrown errors, retryable flags, normalized IAP errors, and redaction guarantees.
---

The SDK separates three kinds of "something didn't happen":

1. **Domain outcomes** — expected results like `{ status: 'failed' }` or
   `entitlements[key]` being inactive. Not exceptions.
2. **Thrown errors** — network, store, runtime, or unexpected native failures.
3. **Snapshot errors** — refresh failures surfaced on the customer-info
   snapshot without destroying cached state.

## Domain outcomes are not exceptions

`allowed`-style checks and purchase failures return values:

```ts compile
const result = await client.purchasePackage(pkg.identifier)

if (result.status === 'failed') {
  // expected domain failure — inspect result.error
  result.error.code // e.g. 'missing_identity', 'product_unavailable'
  result.error.message
  result.error.retryable // drive your retry UI from this
  result.error.metadata // optional extra context
}
```

```ts compile
import { client } from '@piparotech/subkit-expo'
```

Design rule: `cancelled` and `failed` are UI states, not crash reports. Only
unexpected throws belong in your error reporter.

## Thrown errors

Anything the SDK cannot express as a domain outcome throws. Always wrap
purchase and restore flows:

```ts compile
try {
  const result = await client.purchasePackage(pkg.identifier)
  handleResult(result)
} catch (error) {
  reportPurchaseError(error) // unexpected: network, native module, runtime
  showPurchaseFailedMessage()
}
```

Using `client` before `configureSubKit(...)` also throws — configuration order
is a programming error, not a runtime state.

## The retryable flag

`SubKitSerializableError.retryable` tells you whether retrying can help:

- `retryable: true` — transient store/network trouble
  (e.g. `store_unavailable`). Offer a retry button.
- `retryable: false` — a precondition is missing
  (e.g. `missing_identity`, `product_unavailable`). Fix the cause instead:
  identify the user, reload offerings, or hide the package.

## Normalized IAP errors

Raw `expo-iap` errors are inconsistent across platforms. The exported
`normalizeIapError(error)` produces a stable
`{ code?, message, raw }` shape — useful when you build custom flows on the
adapter level. Store-sheet cancellations are detected from the native error and
normalized to the `cancelled` purchase status, so you rarely handle them
yourself.

## Snapshot errors

Refresh failures never erase cached access. The hook exposes them:

```tsx compile
const { active, state, error } = useSubKitEntitlement('pro')

if (state === 'offline') {
  // cached data shown; error explains the failed refresh
}
if (state === 'error') {
  // no usable data at all — show a retry surface
}
```

```ts compile
import { useSubKitEntitlement } from '@piparotech/subkit-expo'
```

## Redaction guarantees

SDK-generated errors never contain bearer tokens, receipts, purchase tokens, or
raw store payloads. You can log them safely.

## Next

- [Advanced configuration](/docs/expo/advanced/)

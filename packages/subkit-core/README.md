# @piparotech/subkit-core

Shared platform-neutral SubKit schemas, DTOs, error contracts, and types used by the Node and Expo SDKs.

## Install

Install Core from the public npm registry with the SDK that consumes it:

```sh
pnpm add @piparotech/subkit-core @piparotech/subkit-node
# or
pnpm add @piparotech/subkit-core @piparotech/subkit-expo
```

Node and Expo declare Core as a required compatible peer dependency. Do not install mismatched versions.

## Direct billing contracts

Core also exports the provider-neutral direct billing contracts used by trusted
server integrations:

- `serverDirectCheckoutSessionRequestSchema` and
  `serverDirectCheckoutSessionResponseSchema`
- `serverBillingPortalSessionRequestSchema` and
  `serverBillingPortalSessionResponseSchema`
- `serverDirectBillingSummaryRequestSchema` and
  `serverDirectBillingSummaryResponseSchema`

Checkout input selects a published offering/package and binds the request to an
app and Subject. For the first Individual slice, the service resolves or
creates the Individual Billing Account from the authenticated active app-user
Subject; the public contract accepts no Billing Account ID, email, or display
name for that selection. Return navigation uses an app-configured
`returnTarget` key, never a caller-supplied URL. Redirects are HTTPS-only and
intent IDs are SubKit-owned prefixed values. The contracts intentionally do not
expose provider IDs, payment-method data, or client secrets.

## Authenticated server grant context

`serverEntitlementCheckResponseSchema` preserves every grant for the requested
app/user/entitlement. Each grant contains its canonical `effective` decision,
source and allocation IDs, nullable store binding, and `context` validated by
`serverGrantContextSchema`. Store names use `apple_app_store` and `google_play`.
`context.billing` distinguishes verified store billing, direct subscription
status/financial state and contract terms; absent data is null, not inferred.
Period ends are not renewal dates. Organization subject IDs identify the
licensee, not the payer or an automatic club membership. Application backends
may add their own club mapping without changing SubKit's access decision.

These details belong to the authenticated Server API (`access:read`). The
public Runtime entitlement endpoint does not expose this expanded context.
No provider transaction IDs, payment methods or provider payloads are included.
Consumers must update service and Core artifacts together; no legacy defaults
are supplied for missing fields.

## Effective Access contract

Core exports `resolveEntitlementAccess(customerInfo, entitlementKey)` and the
`EntitlementAccessDecision` discriminated union. The union has no redundant
access Boolean: `state: 'granted'` is the effective decision, while
`device_blocked` requires a typed recovery reason. Valid branches cannot
represent contradictory states.

App code normally uses the Expo hooks/client rather than calling the resolver
directly. The pure resolver is useful for backend, adapter, and deterministic
contract tests.

## Documentation

- [Choose an integration](https://subkit.piparo.tech/docs/start/choose-an-integration/)
- [API reference](https://subkit.piparo.tech/docs/reference/api/)
- [Error reference](https://subkit.piparo.tech/docs/reference/errors/)

This package must remain independent of Expo, React Native, server credentials, Drizzle, and application runtime modules.

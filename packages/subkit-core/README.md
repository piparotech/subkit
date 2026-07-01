# @piparotech/subkit-core

Shared SubKit API contracts used by the SubKit backend and `@piparotech/subkit-node`.

This package contains platform-neutral schemas, DTOs, and error codes. It must not import Expo, React Native, server credentials, Drizzle, or app runtime modules.

## Runtime IAP contracts

The Expo SDK uses the runtime IAP contracts:

- `runtimeCustomerInfoRequestSchema`
- `runtimeOfferingsRequestSchema`
- `iapReconcileRequestSchema`
- `iapReconcileResponseSchema`
- `CustomerInfo`
- `RuntimeOfferingsResponse`
- `PurchaseSyncResult`
- `StoreIdentityHints`

## Backend server contracts

The backend SDK uses the `server*` contracts:

- `serverEntitlementCheckRequestSchema`
- `serverEntitlementCheckResponseSchema`
- `serverCustomerInfoRequestSchema`
- `serverCustomerInfoResponseSchema`
- `serverOfferingsRequestSchema`
- `serverOfferingsResponseSchema`

## Error contracts

- `subKitErrorCodeSchema`
- `subKitApiErrorResponseSchema`
- `createSubKitError`
- `isRetryableSubKitErrorCode`

---
'@piparotech/subkit-core': minor
'@piparotech/subkit-node': minor
---

Guest checkout accepts an optional `locale` for the checkout language, and the guest status can carry the payer name from checkout. Organization subscription reads can carry the package price and the billing name and address. The new `createOrganizationBillingPortalSession` opens the billing portal for the owner of an organization purchase.

All new response fields are optional, so this SDK still parses responses from services that do not send them yet. Rollout order: adopt this SDK in every consumer before the service returns the new response fields; send `locale` and call the organization billing portal only after the service that supports them is deployed.

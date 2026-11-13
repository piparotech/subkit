---
'@piparotech/subkit-core': minor
---

Guest checkout of a one-time package accepts five optional buyer fields: `customerEmail`, `consents` (`immediateProvision`, `waiverConfirmed`, `textVersion`), `appReference`, `renewal` and `renewalStartsOn`. The guest status can carry `appReference` and `provisionOn`, the day the purchase is delivered: right after the payment with both consents, 14 days after it otherwise. A missing consent never refuses the purchase; it only defers the delivery.

Both status fields are optional and nullable, so this SDK still parses answers from services that do not send them. The service sends them only to apps whose own service decides access, so older clients keep parsing their answers. Rollout order: deploy a service that accepts the buyer fields, then adopt this SDK and send them through `checkout.createGuestSession`. The capabilities stay `direct_billing:write` and `direct_billing:read`.

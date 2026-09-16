---
'@piparotech/subkit-core': minor
---

Guest checkout status can report the payer email and billing address Stripe collected during Checkout. Both fields are optional and nullable, so clients built against this version keep parsing responses from a service that does not return them yet; adopt the service change after this contract ships and only use the identity for the matching purchase reference.

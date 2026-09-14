---
'@piparotech/subkit-core': minor
'@piparotech/subkit-node': minor
'@piparotech/subkit-expo': patch
---

**BREAKING:** Bind personal billing portal actions to the displayed billing account. Read the opaque `accountContext` from billing management discovery and pass that exact context to portal creation. Retain the original idempotency key and context after an uncertain outcome; refresh the displayed account after an authorization conflict rather than replaying the operation for another account. Subscription summaries expose their owned account context independently of effective access.

**BREAKING:** Guest checkout creation requires the reviewed offering `selectionRevision`. Reservation claims require the exact reviewed reservation identity. Update consumers to retain these values from the corresponding read responses, rather than constructing replacements on retry.

Add read-only checkout resumption and original-request recovery, reservation preview and recovery, original-operation cancellation, organization purchase contracts, neutral licensee and pool facts, subject filtering and license ordering discovery. These APIs require a service deployment supporting the corresponding capabilities; publish SDKs and upgrade consumers only as part of that coordinated rollout. Existing access credentials do not grant personal billing authority.

Expo preserves pending purchase and reconciliation outcomes and requires accepted transaction evidence before reporting a successful purchase. Callers must handle pending outcomes without treating them as confirmed access.

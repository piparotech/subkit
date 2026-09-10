---
title: Bind checkout to the reviewed selection
description: Preserve an offering revision from review through guest checkout and retries.
---

Every package from `checkout.getOffering` carries a required `selectionRevision`: an opaque 64-character lowercase hexadecimal value. Preserve it alongside the reviewed package, label, amount, currency, recurrence, audience and benefits. Pass that exact value to `checkout.createGuestSession` as `selectionRevision`.

The revision binds the scoped offering/package identity and label, immutable published plan version, original immutable provider price binding and configured audience. It is not a bearer token, identity proof, tax promise or payment confirmation. The service recomputes it from authoritative records before provider work and again while locking the selected package and channel at first intent creation. Plan benefits and commercial price fields are protected by existing PostgreSQL immutability rules.

Persist the original revision in the local operation before initiating checkout. A retry must retain it and all original request fields; never refresh the revision automatically from the catalog for an unresolved operation. The service includes it in its existing idempotency request hash. A changed revision or stale selection requires explicit review rather than an altered purchase. Missing or failed responses are not evidence that no checkout exists: reconcile the original operation first.

This is a breaking local-unpublished contract change. Older services omit/reject the revision. Deploy and install coherent service/SDK/consumer versions together; do not enable new checkout creation until consumers persist and forward revisions. Retained historical operations without a revision must keep status/association/completion recovery; do not invent a revision from today's offer or recreate the payment. The authenticated checkout creation contract is not covered by this guest slice and still needs equivalent reviewed-selection binding.

Local compilation is not provider E2E evidence. Final acceptance requires actual reviewed monthly/annual/organization Sandbox purchases, catalog-change refusal, identical-request replay and no-second-session evidence.

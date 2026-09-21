---
title: Bind checkout to the reviewed selection
description: Preserve an offering revision from review through guest checkout and retries.
---

Every package from `checkout.getOffering` carries a required `selectionRevision`: an opaque 64-character lowercase hexadecimal value. Preserve it alongside the reviewed package, label, amount, currency, recurrence, audience and benefits. Pass that exact value to `checkout.createGuestSession` as `selectionRevision`.

The revision binds the scoped offering/package identity and label, immutable published plan version, original immutable provider price binding and configured audience. It is not a bearer token, identity proof, tax promise or payment confirmation. The service recomputes it from authoritative records before provider work and again while locking the selected package and channel at first intent creation. Plan benefits and commercial price fields are protected by existing PostgreSQL immutability rules.

Persist the original revision in the local operation before initiating checkout. A retry must retain it and all original request fields; never refresh the revision automatically from the catalog for an unresolved operation. The service includes it in its existing idempotency request hash. A changed revision or stale selection requires explicit review rather than an altered purchase. Missing or failed responses are not evidence that no checkout exists: reconcile the original operation first.

Deploy matching service, SDK and consumer versions before enabling reviewed guest checkout. Preserve recovery for historical operations without a revision; never invent one or recreate their payments. Authenticated checkout is outside this guest contract.

For an existing Sandbox guest purchase, `checkout.resumeGuestSession({ purchaseReference })` reads the original still-open Stripe form without creation, today's offer or a selection revision. The application server must first verify sealed browser ownership of that persisted purchase reference. The service requires app/environment-scoped `direct_billing:write` and the same exact provider checks as authenticated form resumption. Missing, paid, expired or mismatched state returns no form and never frees a new-purchase slot. Keep the bearer URL private and re-check the returned intent against the local operation or separately read guest status. This method requires the matching service deployment; never fall back to `createGuestSession` when unavailable.

To change an unpaid Sandbox selection, verify browser ownership and call `checkout.expireGuestSession({ purchaseReference }, { idempotencyKey })`. Only `state: 'expired'` permits replacement. Preserve the original for recovery. On `completed`, `unavailable` or errors, reconcile that same purchase instead. Serialize replacements across tabs. Requires the deployed service expiration capability and `direct_billing:write`; this does not cancel subscriptions.

Local compilation is not provider E2E evidence. Final acceptance requires actual reviewed monthly/annual/organization Sandbox purchases, catalog-change refusal, identical-request replay and no-second-session evidence.

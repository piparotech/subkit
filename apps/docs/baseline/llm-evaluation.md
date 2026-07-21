# LLM entry-question evaluation

Date: 2026-07-21

Each answer below was verified against the smallest generated corpus that
contains the necessary evidence. The expected answer is intentionally concise;
if a future corpus cannot support it without inference from source code, the
documentation gate should fail.

## 1. Which key belongs in a mobile app?

Corpus: `/llms-small.txt` (also `/llms-mobile.txt`)

Expected answer: Use only a public, app-bound `sk_sdk_…` key. A `sk_srv_…`
server key belongs only in a trusted backend because it can carry mutation
capabilities.

Evidence: Quickstart prerequisites, Expo configuration, security invariant.

## 2. What should the UI do when a purchase is pending?

Corpus: `/llms-mobile.txt`

Expected answer: Keep paid access locked, show a waiting state, and refresh or
sync customer info. Unlock only after provider verification produces an active
entitlement.

Evidence: Making purchases, restore/sync, troubleshooting.

## 3. How does a seat invitation become access?

Corpus: `/llms-concepts.txt` for the domain path; `/llms-backend.txt` for the
backend operation.

Expected answer: The invitation reserves capacity in an Access Pool. Claiming
it creates or activates an Allocation for the Access Subject; Entitlement Grants
are derived from the verified Source, Pool, Allocation, and Plan rules.

Evidence: Access model and Node backend overview.

## 4. What should application code check to authorize a feature?

Corpus: `/llms-small.txt`

Expected answer: Check whether the Access Subject has the required effective
entitlement. Do not authorize from subscription state, plan/package IDs, store
product IDs, or the purchase call result.

Evidence: root invariant, Quickstart, Access model.

## 5. May SubKit write store catalog changes automatically?

Corpus: `/llms-operations.txt`

Expected answer: No. Store reads/import/drift may run automatically. Store
writes require Preview, explicit confirmation, Apply, and Verify, and remain
feature-flagged.

Evidence: root invariant, store overview, security/go-live content.

## 6. What is required for a trusted backend mutation?

Corpus: `/llms-backend.txt` and `/llms-api.txt`

Expected answer: A tenant/app-scoped server key with the documented capability,
an idempotency key where required, and an audit reason. Retry only according to
the documented error/idempotency behavior.

Evidence: Node backend overview and reference overview.

## Result

All six questions are answerable from the named smallest corpora without
reading the repository source or the internal root `docs/` directory.

---
title: Security model
description: How SubKit handles keys, secrets, verification, and least privilege.
---

SubKit's security model follows from one principle: SubKit state is
authoritative, and external inputs are verified before they change access.

## Keys

- **Public SDK keys** (`sk_sdk_…`) go in apps. They resolve only the app and
  cannot mutate commerce or access.
- **Server keys** (`sk_srv_…`) go only in trusted backends and carry explicit
  capabilities. Grant the minimum capabilities each integration needs.
- SubKit stores only **hashes** of keys. Issue an SDK key once from trusted
  backend code and use the returned plaintext a single time in your app config.

## Secrets stay invisible

- Private provider credentials are **one-way uploads**: write-only, redacted
  everywhere else, and audited.
- `SECRET_ENCRYPTION_KEY` protects persisted provider credentials and key
  hashing. It must stay stable across restarts and key rotations.
- SDK errors never include bearer tokens, receipts, purchase tokens, or raw
  store payloads.

## Verification, not trust

- Unverified client claims never create access.
- Store purchases unlock access only after provider verification and a
  `granted` Effective Access decision.
- Application code never reconstructs access policy by combining raw
  entitlement, device, or offline fields. That policy remains inside SubKit.
- Webhooks and notifications (Apple Server Notifications, Google RTDN) are
  authenticated before they create sources.

## Least privilege and audit

- Every mutation records the acting key, an operator reason, and before/after
  evidence in an immutable audit log.
- Scope server keys per app and per capability. Rotate them independently; SDK
  key deletion is safe because keys are re-issuable and non-destructive.

## Store writes are gated

Store writes never run automatically. They require preview, explicit typed
confirmation, apply, then verify, behind a feature flag. See
[Stores](/docs/stores/overview/).

## Related

- [Reference](/docs/reference/overview/)
- [Go-live checklist](/docs/operations/go-live/)

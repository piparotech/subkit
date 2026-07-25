---
title: Error model
description: SubKit error codes, HTTP behavior, retry guidance, and safe user reactions.
---

HTTP errors use this shape:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The request is invalid.",
    "requestId": "req_123"
  }
}
```

The Node SDK throws `SubKitApiError` with `code`, `status`, `requestId`, and a
redacted message. Expo purchase states such as `pending` or `cancelled` are
expected outcomes and are not automatically transport errors.

## Retry policy

The shared contract marks only these codes retryable by default:

- `network`
- `rate_limited`
- `service_unavailable`
- `server_error`

Use bounded exponential backoff, preserve the same idempotency key for the same
server mutation, and respect `Retry-After` when supplied. Do not retry validation,
auth, capability, ownership, beneficiary, or idempotency conflicts unchanged.

## Codes

| Code                          | Typical status | Retry unchanged? | Reaction                                                       |
| ----------------------------- | -------------- | ---------------- | -------------------------------------------------------------- |
| `cancelled`                   | 400            | No               | Treat as normal user intent.                                   |
| `not_ready`                   | 409/503        | Later            | Keep access locked; wait for initialization/sync.              |
| `store_unavailable`           | 503            | Yes              | Show temporary Store outage.                                   |
| `product_unavailable`         | 409            | No               | Refresh offerings; never substitute a static Store ID.         |
| `already_owned`               | 409            | No               | Refresh/restore CustomerInfo.                                  |
| `network`                     | 503            | Yes              | Preserve bounded offline authority and retry.                  |
| `validation_failed`           | 400/422        | No               | Fix request/provider evidence.                                 |
| `ownership_conflict`          | 409            | No               | Keep access locked and offer support/restore guidance.         |
| `login_required`              | 401            | After login      | Identify the app user, then retry.                             |
| `beneficiary_conflict`        | 409            | No               | Resolve the selected beneficiary explicitly.                   |
| `device_selection_required`   | 409            | After selection  | Show device activation choices.                                |
| `device_replacement_cooldown` | 409            | Later            | Display the next eligible time.                                |
| `device_change_limit_reached` | 409            | No               | Explain policy; require operator/support action.               |
| `device_replaced`             | 409            | After refresh    | Refresh device and CustomerInfo state.                         |
| `rate_limited`                | 429            | Yes              | Back off and honor `Retry-After`.                              |
| `unauthorized`                | 401            | No               | Replace missing/invalid key; do not expose it in logs.         |
| `forbidden`                   | 403            | No               | Use a correctly scoped key/capability.                         |
| `not_found`                   | 404            | No               | Check app-scoped identifier; do not infer cross-app existence. |
| `invalid_request`             | 400            | No               | Correct shape, headers, or required reason.                    |
| `idempotency_conflict`        | 409            | No               | Do not reuse a key for different evidence.                     |
| `webhook_verification_failed` | 401/400        | No unchanged     | Fix provider signature/topic configuration.                    |
| `service_unavailable`         | 503            | Yes              | Retry with backoff; keep fail-closed behavior.                 |
| `server_error`                | 500            | Yes              | Retry safely and retain the request ID for support.            |
| `unknown`                     | 500            | No by default    | Fail closed; capture the request ID.                           |

## Domain denials

Entitlement checks return `allowed: false` with a domain reason when the request
succeeded but access is not effective. Do not turn this into a retry loop or an
exceptional crash. Render the matching paywall, login, restore, device, or
support state.

## Secret hygiene

Never log bearer keys, receipts, purchase tokens, raw Store payloads, invitation
tokens, or webhook bodies. SDK-generated errors redact sensitive evidence; keep
application telemetry equally strict.

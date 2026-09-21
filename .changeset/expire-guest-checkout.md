---
'@piparotech/subkit-core': minor
'@piparotech/subkit-node': minor
---

Add checkout.expireGuestSession for safely ending an unpaid Sandbox checkout before changing a selection. Requires a service supporting the guest checkout expire action and direct_billing:write capability. Only the expired result permits a replacement; completed or unavailable results must preserve the original purchase. Publish the SDK first, deploy the matching service capability, then enable replacement flows in consumers.

---
'@piparotech/subkit-expo': patch
---

A purchase that `purchasePackage` already verified no longer loses its access a moment later. expo-iap reports the same purchase through `purchaseUpdatedListener` too, and its replay ended in an empty reconcile without the signed access context, which overwrote the verified entitlement until the next restore or app start. Purchase events now refresh the existing access context after an empty reconcile, the same way `syncPurchases` already did. Fixes #6.

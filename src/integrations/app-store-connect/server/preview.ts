import type { AppleCatalogProduct } from '~/server/app-store-connect/client'

import type { AppStoreConnectProductPreview } from '~/integrations/app-store-connect/types'

export interface ApplePreviewLocalProduct {
  appleProductId: string | null
  billingPeriod: string | null
  name: string
  productKey: string
}

export function previewProduct(
  appleProduct: AppleCatalogProduct,
  localProducts: readonly ApplePreviewLocalProduct[],
): AppStoreConnectProductPreview {
  const matchingByStoreId = localProducts.filter((product) => product.appleProductId === appleProduct.productId)
  const matchingByKey = localProducts.filter((product) => product.productKey === appleProduct.productId)
  const match = matchingByStoreId[0] ?? matchingByKey[0]

  if (matchingByStoreId.length + matchingByKey.length > 1) {
    return {
      action: 'conflict',
      appleName: appleProduct.name,
      appleProductId: appleProduct.productId,
      appleState: appleProduct.state,
      duration: appleProduct.duration,
      entitlement: appleProduct.entitlementKey,
      kind: appleProduct.kind,
      localIdentifier: match?.productKey ?? null,
      localName: match?.name ?? null,
      note: 'Multiple SubKit products reference this Apple product ID.',
    }
  }

  if (match == null) {
    return {
      action: 'create',
      appleName: appleProduct.name,
      appleProductId: appleProduct.productId,
      appleState: appleProduct.state,
      duration: appleProduct.duration,
      entitlement: appleProduct.entitlementKey,
      kind: appleProduct.kind,
      localIdentifier: null,
      localName: null,
      note: 'Adopt this store product as a SubKit product or bind it to an existing plan.',
    }
  }

  const changed = match.name !== appleProduct.name || match.billingPeriod !== appleProduct.duration || match.appleProductId !== appleProduct.productId
  return {
    action: changed ? 'update' : 'unchanged',
    appleName: appleProduct.name,
    appleProductId: appleProduct.productId,
    appleState: appleProduct.state,
    duration: appleProduct.duration,
    entitlement: appleProduct.entitlementKey,
    kind: appleProduct.kind,
    localIdentifier: match.productKey,
    localName: match.name,
    note: changed ? 'SubKit canonical state differs from the Apple catalog snapshot.' : 'SubKit product already matches the Apple catalog snapshot.',
  }
}

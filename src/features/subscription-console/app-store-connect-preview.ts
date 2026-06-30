import type { products } from '~/db/schema'
import type { AppleCatalogProduct } from '~/server/app-store-connect/client'

import type { AppStoreConnectProductPreview } from './types'

export function previewProduct(
  appleProduct: AppleCatalogProduct,
  localProducts: readonly (typeof products.$inferSelect)[],
): AppStoreConnectProductPreview {
  const matchingByStoreId = localProducts.filter((product) => product.appStoreId === appleProduct.productId)
  const matchingByIdentifier = localProducts.filter((product) => product.identifier === appleProduct.productId)
  const match = matchingByStoreId[0] ?? matchingByIdentifier[0]

  if (matchingByStoreId.length + matchingByIdentifier.length > 1) {
    return {
      action: 'conflict',
      appleName: appleProduct.name,
      appleProductId: appleProduct.productId,
      appleState: appleProduct.state,
      duration: appleProduct.duration,
      entitlement: appleProduct.entitlementKey,
      kind: appleProduct.kind,
      localIdentifier: match?.identifier ?? null,
      localName: match?.displayName ?? null,
      note: 'Multiple local products reference this Apple product ID.',
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
      note: 'Create a local product mapped to this Apple product ID. Price stays unset until report/price sync is added.',
    }
  }

  const changed = match.displayName !== appleProduct.name || match.duration !== appleProduct.duration || match.appStoreId !== appleProduct.productId
  return {
    action: changed ? 'update' : 'unchanged',
    appleName: appleProduct.name,
    appleProductId: appleProduct.productId,
    appleState: appleProduct.state,
    duration: appleProduct.duration,
    entitlement: appleProduct.entitlementKey,
    kind: appleProduct.kind,
    localIdentifier: match.identifier,
    localName: match.displayName,
    note: changed ? 'Update local name, duration, or App Store product mapping.' : 'Local product already matches the Apple catalogue snapshot.',
  }
}

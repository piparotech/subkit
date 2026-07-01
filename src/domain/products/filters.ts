import type { CatalogProduct } from '~/domain/products/types'

export function filterProducts(products: CatalogProduct[], query: string): CatalogProduct[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return products
  return products.filter((product) =>
    [
      product.name,
      product.productKey,
      product.planKey,
      product.entitlement,
      product.appleProductId,
      product.googleProductId,
      product.googleBasePlanId,
      product.productType,
      product.status,
    ]
      .join(' ')
      .toLowerCase()
      .includes(normalized),
  )
}

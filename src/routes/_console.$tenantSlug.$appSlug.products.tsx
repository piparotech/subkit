import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import type { AppConsoleViewRenderProps, ConsoleActionContext } from '~/console/types'
import { ProductsView } from '~/domain/products/ProductsView'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/products')({
  component: ProductsRoute,
})

function ProductsRoute() {
  return (
    <AppRouteView
      primaryAction={newProductPrimaryAction}
      renderView={renderProductsView}
      searchPlaceholder="Search products, plans, entitlements…"
      title="Products"
    />
  )
}

function renderProductsView({ isFiltering, onOpenProduct, products }: AppConsoleViewRenderProps) {
  return (
    <ProductsView isFiltering={isFiltering} onOpenProduct={onOpenProduct} products={products} />
  )
}

function newProductPrimaryAction({ currentApp, openProductCreator }: ConsoleActionContext) {
  if (currentApp == null) return null
  return { label: 'New Product', onPress: openProductCreator }
}

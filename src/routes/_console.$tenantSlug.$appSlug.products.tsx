import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import { ProductsView } from '~/domain/products/ProductsView'
import { consoleRouteData, type AppConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/products')({
  component: ProductsRoute,
  staticData: consoleRouteData('products'),
})

function ProductsRoute() {
  return <AppRouteView renderView={renderProductsView} />
}

function renderProductsView({ isFiltering, onOpenProduct, products }: AppConsoleViewRenderProps) {
  return <ProductsView isFiltering={isFiltering} onOpenProduct={onOpenProduct} products={products} />
}

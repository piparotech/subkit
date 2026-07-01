import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/products')({
  component: ProductsRoute,
})

function ProductsRoute() {
  return <AppRouteView view="products" />
}

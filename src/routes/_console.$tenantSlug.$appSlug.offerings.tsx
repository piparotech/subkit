import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/offerings')({
  component: OfferingsRoute,
})

function OfferingsRoute() {
  return <AppRouteView view="offerings" />
}

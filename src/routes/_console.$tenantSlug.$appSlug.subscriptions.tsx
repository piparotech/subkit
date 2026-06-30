import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/features/subscription-console/RouteViews'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/subscriptions')({
  component: SubscriptionsRoute,
})

function SubscriptionsRoute() {
  return <AppRouteView view="subscriptions" />
}

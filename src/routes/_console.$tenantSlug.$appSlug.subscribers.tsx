import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/features/subkit/RouteViews'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/subscribers')({
  component: SubscribersRoute,
})

function SubscribersRoute() {
  return <AppRouteView view="subscribers" />
}

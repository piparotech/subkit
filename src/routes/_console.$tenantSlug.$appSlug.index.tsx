import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/features/subscription-console/RouteViews'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/')({
  component: DashboardRoute,
})

function DashboardRoute() {
  return <AppRouteView view="dashboard" />
}

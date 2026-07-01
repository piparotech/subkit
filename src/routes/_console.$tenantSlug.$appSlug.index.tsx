import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/')({
  component: DashboardRoute,
})

function DashboardRoute() {
  return <AppRouteView view="dashboard" />
}

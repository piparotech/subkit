import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import { DashboardView } from '~/domain/dashboard/DashboardView'
import { consoleRouteData, type AppConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/')({
  component: DashboardRoute,
  staticData: consoleRouteData('dashboard'),
})

function DashboardRoute() {
  return <AppRouteView renderView={renderDashboardView} />
}

function renderDashboardView({ consoleData, currentApp }: AppConsoleViewRenderProps) {
  const dashboard = consoleData.dashboards.find((item) => item.appId === currentApp.id)
  if (dashboard == null) throw new Error('Dashboard data missing for selected app')
  return (
    <DashboardView
      activity={dashboard.activity}
      app={currentApp}
      metrics={dashboard.metrics}
      revenueBars={dashboard.revenueBars}
      runtime={consoleData.runtime}
    />
  )
}

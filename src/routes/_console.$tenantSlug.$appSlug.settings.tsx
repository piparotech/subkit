import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import { AppSettingsView } from '~/integrations/app-store-connect/AppSettingsView'
import { consoleRouteData, type AppConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/settings')({
  component: SettingsRoute,
  staticData: consoleRouteData('settings'),
})

function SettingsRoute() {
  return <AppRouteView renderView={renderSettingsView} />
}

function renderSettingsView({ connection, currentApp, onAppDeleted, onRefreshConsoleData }: AppConsoleViewRenderProps) {
  return (
    <AppSettingsView
      app={currentApp}
      connection={connection}
      onAppDeleted={onAppDeleted}
      onRefreshConsoleData={onRefreshConsoleData}
    />
  )
}

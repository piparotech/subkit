import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import type { AppConsoleViewRenderProps } from '~/console/types'
import { AppSettingsView } from '~/integrations/app-store-connect/AppSettingsView'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/settings')({
  component: SettingsRoute,
})

function SettingsRoute() {
  return <AppRouteView title="Settings" renderView={renderSettingsView} />
}

function renderSettingsView({
  connection,
  currentApp,
  onAppDeleted,
  onRefreshConsoleData,
}: AppConsoleViewRenderProps) {
  return (
    <AppSettingsView
      app={currentApp}
      connection={connection}
      onAppDeleted={onAppDeleted}
      onRefreshConsoleData={onRefreshConsoleData}
    />
  )
}

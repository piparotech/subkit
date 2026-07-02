import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceRouteView } from '~/console/WorkspaceRouteView'
import { WorkspaceSettingsView } from '~/integrations/app-store-connect/WorkspaceSettingsView'
import { consoleRouteData, type ConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/settings')({
  component: WorkspaceSettingsRoute,
  staticData: consoleRouteData('workspaceSettings'),
})

function WorkspaceSettingsRoute() {
  return <WorkspaceRouteView renderView={renderWorkspaceSettingsView} />
}

function renderWorkspaceSettingsView({ connection, onRefreshConsoleData, tenant }: ConsoleViewRenderProps) {
  return <WorkspaceSettingsView connection={connection} onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} />
}

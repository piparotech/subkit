import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceRouteView } from '~/console/WorkspaceRouteView'
import { WorkspaceSettingsView } from '~/integrations/app-store-connect/WorkspaceSettingsView'
import type { ConsoleViewRenderProps } from '~/console/types'

export const Route = createFileRoute('/_console/settings')({
  component: WorkspaceSettingsRoute,
})

function WorkspaceSettingsRoute() {
  return <WorkspaceRouteView renderView={renderWorkspaceSettingsView} title="Workspace Settings" />
}

function renderWorkspaceSettingsView({ connection, onRefreshConsoleData, tenant }: ConsoleViewRenderProps) {
  return <WorkspaceSettingsView connection={connection} onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} />
}

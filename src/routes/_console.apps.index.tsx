import { createFileRoute } from '@tanstack/react-router'

import { AppsView } from '~/domain/apps/AppsView'
import { WorkspaceRouteView } from '~/console/WorkspaceRouteView'
import { consoleRouteData, type ConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/apps/')({
  component: AppsRoute,
  staticData: consoleRouteData('apps'),
})

function AppsRoute() {
  return <WorkspaceRouteView renderView={renderAppsView} />
}

function renderAppsView({ apps, canCreateApps, connection, isFiltering, onCreateApp }: ConsoleViewRenderProps) {
  return (
    <AppsView
      apps={apps}
      canCreateApps={canCreateApps}
      connection={connection}
      isFiltering={isFiltering}
      onCreateApp={onCreateApp}
    />
  )
}

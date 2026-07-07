import { createFileRoute } from '@tanstack/react-router'

import { AppsView } from '~/domain/apps/AppsView'
import { WorkspaceRouteView } from '~/console/WorkspaceRouteView'
import type { ConsoleActionContext, ConsoleViewRenderProps } from '~/console/types'

export const Route = createFileRoute('/_console/apps/')({
  component: AppsRoute,
})

function AppsRoute() {
  return (
    <WorkspaceRouteView
      primaryAction={newAppPrimaryAction}
      renderView={renderAppsView}
      searchPlaceholder="Search apps…"
      title="Apps"
    />
  )
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

function newAppPrimaryAction({ canCreateApps, openAppCreator }: ConsoleActionContext) {
  if (!canCreateApps) return null
  return { label: 'New App', onPress: openAppCreator }
}

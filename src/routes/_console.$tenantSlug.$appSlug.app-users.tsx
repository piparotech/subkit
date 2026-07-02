import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import { AppUsersView } from '~/domain/app-users/AppUsersView'
import { consoleRouteData, type AppConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/app-users')({
  component: AppUsersRoute,
  staticData: consoleRouteData('appUsers'),
})

function AppUsersRoute() {
  return <AppRouteView renderView={renderAppUsersView} />
}

function renderAppUsersView({ appUsers, isFiltering, onOpenAppUser }: AppConsoleViewRenderProps) {
  return <AppUsersView appUsers={appUsers} isFiltering={isFiltering} onOpenAppUser={onOpenAppUser} />
}

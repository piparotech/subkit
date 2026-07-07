import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import { AppUsersView } from '~/domain/app-users/AppUsersView'
import type { AppConsoleViewRenderProps } from '~/console/types'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/app-users')({
  component: AppUsersRoute,
})

function AppUsersRoute() {
  return (
    <AppRouteView
      renderView={renderAppUsersView}
      searchPlaceholder="Search App Users, countries, entitlements…"
      title="App Users"
    />
  )
}

function renderAppUsersView({ appUsers, isFiltering, onOpenAppUser }: AppConsoleViewRenderProps) {
  return <AppUsersView appUsers={appUsers} isFiltering={isFiltering} onOpenAppUser={onOpenAppUser} />
}

import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/features/subkit/AppRouteView'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/app-users')({
  component: AppUsersRoute,
})

function AppUsersRoute() {
  return <AppRouteView view="appUsers" />
}

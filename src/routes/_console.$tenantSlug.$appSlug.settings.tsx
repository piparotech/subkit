import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/features/subkit/RouteViews'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/settings')({
  component: SettingsRoute,
})

function SettingsRoute() {
  return <AppRouteView view="settings" />
}

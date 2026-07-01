import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/features/subkit/AppRouteView'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/entitlements')({
  component: EntitlementsRoute,
})

function EntitlementsRoute() {
  return <AppRouteView view="entitlements" />
}

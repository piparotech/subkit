import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import { EntitlementsView } from '~/domain/entitlements/EntitlementsView'
import { consoleRouteData, type AppConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/entitlements')({
  component: EntitlementsRoute,
  staticData: consoleRouteData('entitlements'),
})

function EntitlementsRoute() {
  return <AppRouteView renderView={renderEntitlementsView} />
}

function renderEntitlementsView({ entitlements }: AppConsoleViewRenderProps) {
  return <EntitlementsView entitlements={entitlements} />
}

import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import type { AppConsoleViewRenderProps } from '~/console/types'
import { EntitlementsView } from '~/domain/entitlements/EntitlementsView'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/entitlements')({
  component: EntitlementsRoute,
})

function EntitlementsRoute() {
  return <AppRouteView title="Entitlements" renderView={renderEntitlementsView} />
}

function renderEntitlementsView({ entitlements }: AppConsoleViewRenderProps) {
  return <EntitlementsView entitlements={entitlements} />
}

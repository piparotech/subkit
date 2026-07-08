import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import type { AppConsoleViewRenderProps } from '~/console/types'
import { StoresView } from '~/domain/stores/StoresView'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/stores')({
  component: StoresRoute,
})

function StoresRoute() {
  return <AppRouteView title="Stores" renderView={renderStoresView} />
}

function renderStoresView({ consoleData, currentApp }: AppConsoleViewRenderProps) {
  const storeSync = consoleData.storeSync.find((item) => item.appId === currentApp.id)
  if (storeSync == null) throw new Error('Store sync data missing for selected app')
  return <StoresView storeSync={storeSync} />
}

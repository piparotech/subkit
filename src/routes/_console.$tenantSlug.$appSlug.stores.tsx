import { createFileRoute } from '@tanstack/react-router'

import { AppRouteView } from '~/console/AppRouteView'
import { StoresView } from '~/domain/stores/StoresView'
import { consoleRouteData, type AppConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/$tenantSlug/$appSlug/stores')({
  component: StoresRoute,
  staticData: consoleRouteData('stores'),
})

function StoresRoute() {
  return <AppRouteView renderView={renderStoresView} />
}

function renderStoresView({ consoleData, currentApp }: AppConsoleViewRenderProps) {
  const storeSync = consoleData.storeSync.find((item) => item.appId === currentApp.id)
  if (storeSync == null) throw new Error('Store sync data missing for selected app')
  return <StoresView storeSync={storeSync} />
}

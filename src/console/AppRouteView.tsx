import { useLoaderData, useParams } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { appMatchesRouteParams } from '~/console/routing'
import { SubKitConsole } from '~/console/SubKitConsole'
import { isAppConsoleView, useActiveConsoleView, type AppConsoleViewRenderProps } from '~/console/views'

export function AppRouteView({ renderView }: { renderView: (props: AppConsoleViewRenderProps) => ReactNode }) {
  const consoleData = useLoaderData({ from: '/_console' })
  const { appSlug, tenantSlug } = useParams({ from: '/_console/$tenantSlug/$appSlug' })
  const app = consoleData.apps.find((item) => appMatchesRouteParams(item, { appSlug, tenantSlug })) ?? null
  const view = useActiveConsoleView()

  if (!isAppConsoleView(view)) throw new Error(`${view} is not an app console route`)

  return <SubKitConsole currentAppId={app?.id ?? null} renderView={renderView} scope="app" view={view} />
}

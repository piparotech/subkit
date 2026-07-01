import { useLoaderData, useParams } from '@tanstack/react-router'

import { appMatchesRouteParams } from '~/console/routing'
import { SubKitConsole } from '~/console/SubKitConsole'
import type { View } from '~/console/types'

type AppRouteViewName = Extract<View, 'dashboard' | 'subscriptions' | 'entitlements' | 'offerings' | 'appUsers' | 'settings'>

export function AppRouteView({ view }: { view: AppRouteViewName }) {
  const consoleData = useLoaderData({ from: '/_console' })
  const { appSlug, tenantSlug } = useParams({ from: '/_console/$tenantSlug/$appSlug' })
  const app = consoleData.apps.find((item) => appMatchesRouteParams(item, { appSlug, tenantSlug })) ?? null
  return <SubKitConsole currentAppId={app?.id ?? null} view={view} />
}

import { useLoaderData, useParams } from '@tanstack/react-router'

import { appMatchesRouteParams } from './store'
import { SubKitConsole } from './SubKitConsole'
import type { View } from './types'

type AppRouteViewName = Extract<View, 'dashboard' | 'subscriptions' | 'entitlements' | 'offerings' | 'subscribers' | 'settings'>

export function AppRouteView({ view }: { view: AppRouteViewName }) {
  const consoleData = useLoaderData({ from: '/_console' })
  const { appSlug, tenantSlug } = useParams({ from: '/_console/$tenantSlug/$appSlug' })
  const app = consoleData.apps.find((item) => appMatchesRouteParams(item, { appSlug, tenantSlug })) ?? null
  return <SubKitConsole currentAppId={app?.id ?? null} view={view} />
}

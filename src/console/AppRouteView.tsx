import type { ReactNode } from 'react'

import { useLoaderData, useParams } from '@tanstack/react-router'

import { SubKitConsole } from '~/console/SubKitConsole'
import { appMatchesRouteParams } from '~/console/routing'
import type { AppConsoleViewRenderProps, ConsolePrimaryActionFactory } from '~/console/types'

export function AppRouteView({
  primaryAction,
  renderView,
  searchPlaceholder,
  title,
}: {
  primaryAction?: ConsolePrimaryActionFactory
  renderView: (props: AppConsoleViewRenderProps) => ReactNode
  searchPlaceholder?: string | null
  title: string
}) {
  const consoleData = useLoaderData({ from: '/_console' })
  const { appSlug, tenantSlug } = useParams({ from: '/_console/$tenantSlug/$appSlug' })
  const app =
    consoleData.apps.find((item) => appMatchesRouteParams(item, { appSlug, tenantSlug })) ?? null

  return (
    <SubKitConsole
      currentAppId={app?.id ?? null}
      primaryAction={primaryAction}
      renderView={renderView}
      scope="app"
      searchPlaceholder={searchPlaceholder}
      title={title}
    />
  )
}

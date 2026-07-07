import type { ReactNode } from 'react'

import { SubKitConsole } from '~/console/SubKitConsole'
import type { ConsolePrimaryActionFactory, ConsoleViewRenderProps } from '~/console/types'

export function WorkspaceRouteView({
  primaryAction,
  renderView,
  searchPlaceholder,
  title,
}: {
  primaryAction?: ConsolePrimaryActionFactory
  renderView: (props: ConsoleViewRenderProps) => ReactNode
  searchPlaceholder?: string | null
  title: string
}) {
  return (
    <SubKitConsole
      currentAppId={null}
      primaryAction={primaryAction}
      renderView={renderView}
      scope="workspace"
      searchPlaceholder={searchPlaceholder}
      title={title}
    />
  )
}

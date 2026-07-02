import type { ReactNode } from 'react'

import { SubKitConsole } from '~/console/SubKitConsole'
import { isWorkspaceConsoleView, useActiveConsoleView, type ConsoleViewRenderProps } from '~/console/views'

export function WorkspaceRouteView({ renderView }: { renderView: (props: ConsoleViewRenderProps) => ReactNode }) {
  const view = useActiveConsoleView()

  if (!isWorkspaceConsoleView(view)) throw new Error(`${view} is not a workspace console route`)

  return <SubKitConsole currentAppId={null} renderView={renderView} scope="workspace" view={view} />
}

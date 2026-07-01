import { createFileRoute } from '@tanstack/react-router'

import { SubKitConsole } from '~/console'

export const Route = createFileRoute('/_console/settings')({
  component: WorkspaceSettingsRoute,
})

function WorkspaceSettingsRoute() {
  return <SubKitConsole currentAppId={null} view="workspaceSettings" />
}

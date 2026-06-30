import { createFileRoute } from '@tanstack/react-router'

import { SubKitConsole } from '~/features/subkit/SubKitConsole'

export const Route = createFileRoute('/_console/settings')({
  component: WorkspaceSettingsRoute,
})

function WorkspaceSettingsRoute() {
  return <SubKitConsole currentAppId={null} view="workspaceSettings" />
}

import { createFileRoute } from '@tanstack/react-router'

import { SubscriptionConsole } from '~/features/subscription-console/SubscriptionConsole'

export const Route = createFileRoute('/_console/settings')({
  component: WorkspaceSettingsRoute,
})

function WorkspaceSettingsRoute() {
  return <SubscriptionConsole currentAppId={null} view="workspaceSettings" />
}

import { createFileRoute } from '@tanstack/react-router'

import { SubscriptionConsole } from '~/features/subscription-console/SubscriptionConsole'

export const Route = createFileRoute('/_console/apps/')({
  component: AppsRoute,
})

function AppsRoute() {
  return <SubscriptionConsole currentAppId={null} view="apps" />
}

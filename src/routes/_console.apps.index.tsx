import { createFileRoute } from '@tanstack/react-router'

import { SubKitConsole } from '~/console'

export const Route = createFileRoute('/_console/apps/')({
  component: AppsRoute,
})

function AppsRoute() {
  return <SubKitConsole currentAppId={null} view="apps" />
}

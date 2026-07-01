import { createFileRoute } from '@tanstack/react-router'

import { SubKitConsole } from '~/console'

export const Route = createFileRoute('/_console/members')({
  component: TenantMembersRoute,
})

function TenantMembersRoute() {
  return <SubKitConsole currentAppId={null} view="tenantMembers" />
}

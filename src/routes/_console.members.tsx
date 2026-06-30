import { createFileRoute } from '@tanstack/react-router'

import { SubKitConsole } from '~/features/subkit/SubKitConsole'

export const Route = createFileRoute('/_console/members')({
  component: TenantMembersRoute,
})

function TenantMembersRoute() {
  return <SubKitConsole currentAppId={null} view="tenantMembers" />
}

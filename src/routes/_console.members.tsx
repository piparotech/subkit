import { createFileRoute } from '@tanstack/react-router'

import { TenantMembersView } from '~/domain/tenants/TenantMembersView'
import { WorkspaceRouteView } from '~/console/WorkspaceRouteView'
import type { ConsoleViewRenderProps } from '~/console/types'

export const Route = createFileRoute('/_console/members')({
  component: TenantMembersRoute,
})

function TenantMembersRoute() {
  return (
    <WorkspaceRouteView
      renderView={renderTenantMembersView}
      searchPlaceholder="Search workspace members…"
      title="Workspace Members"
    />
  )
}

function renderTenantMembersView({ isFiltering, onRefreshConsoleData, tenant, tenantMembers }: ConsoleViewRenderProps) {
  return <TenantMembersView isFiltering={isFiltering} onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} tenantMembers={tenantMembers} />
}

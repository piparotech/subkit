import { createFileRoute } from '@tanstack/react-router'

import { TenantMembersView } from '~/domain/tenants/TenantMembersView'
import { WorkspaceRouteView } from '~/console/WorkspaceRouteView'
import { consoleRouteData, type ConsoleViewRenderProps } from '~/console/views'

export const Route = createFileRoute('/_console/members')({
  component: TenantMembersRoute,
  staticData: consoleRouteData('tenantMembers'),
})

function TenantMembersRoute() {
  return <WorkspaceRouteView renderView={renderTenantMembersView} />
}

function renderTenantMembersView({ isFiltering, onRefreshConsoleData, tenant, tenantMembers }: ConsoleViewRenderProps) {
  return <TenantMembersView isFiltering={isFiltering} onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} tenantMembers={tenantMembers} />
}

import { AppRouteNotFound } from '~/console/AppRouteNotFound'
import { AppSettingsView } from '~/integrations/app-store-connect/AppSettingsView'
import { AppUsersView } from '~/domain/app-users/AppUsersView'
import { AppsView } from '~/domain/apps/AppsView'
import { DashboardView } from '~/domain/dashboard/DashboardView'
import { EntitlementsView } from '~/domain/entitlements/EntitlementsView'
import { OfferingsView } from '~/domain/offerings/OfferingsView'
import { SubscriptionsView } from '~/domain/subscriptions/SubscriptionsView'
import { TenantMembersView } from '~/domain/tenants/TenantMembersView'
import type { AppUser } from '~/domain/app-users/types'
import type { AppTenant } from '~/domain/apps/types'
import type { Entitlement } from '~/domain/entitlements/types'
import type { Offering } from '~/domain/offerings/types'
import type { SubscriptionProduct } from '~/domain/subscriptions/types'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'
import type { ConsoleData, View } from '~/console/types'
import { WorkspaceSettingsView } from '~/integrations/app-store-connect/WorkspaceSettingsView'

export function ActiveView({
  apps,
  connection,
  consoleData,
  currentApp,
  tenant,
  entitlements,
  offerings,
  onAppDeleted,
  onOpenAppUser,
  onOpenSubscription,
  onRefreshConsoleData,
  appUsers,
  subscriptions,
  view,
}: {
  apps: AppTenant[]
  connection: AppStoreConnectConnection | null
  consoleData: ConsoleData
  currentApp: AppTenant | null
  tenant: ConsoleData['tenant']
  entitlements: Entitlement[]
  offerings: Offering[]
  onAppDeleted: (id: string) => void
  onOpenAppUser: (appUser: AppUser) => void
  onOpenSubscription: (subscription: SubscriptionProduct) => void
  onRefreshConsoleData: () => void
  appUsers: AppUser[]
  subscriptions: SubscriptionProduct[]
  view: View
}) {
  if (view === 'tenantMembers') {
    return <TenantMembersView onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} tenantMembers={consoleData.tenantMembers} />
  }

  if (view === 'workspaceSettings') {
    return <WorkspaceSettingsView connection={connection} onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} />
  }

  if (view === 'apps') return <AppsView apps={apps} />

  if (currentApp == null) return <AppRouteNotFound apps={apps} />

  switch (view) {
    case 'dashboard': {
      const dashboard = consoleData.dashboards.find((item) => item.appId === currentApp.id)
      if (dashboard == null) throw new Error('Dashboard data missing for selected app')
      return (
        <DashboardView
          activity={dashboard.activity}
          app={currentApp}
          dbStats={consoleData.stats}
          metrics={dashboard.metrics}
          revenueBars={dashboard.revenueBars}
          runtime={consoleData.runtime}
        />
      )
    }
    case 'subscriptions':
      return <SubscriptionsView onOpenSubscription={onOpenSubscription} subscriptions={subscriptions} />
    case 'entitlements':
      return <EntitlementsView entitlements={entitlements} />
    case 'offerings':
      return <OfferingsView offerings={offerings} />
    case 'appUsers':
      return <AppUsersView appUsers={appUsers} onOpenAppUser={onOpenAppUser} />
    case 'settings':
      return (
        <AppSettingsView
          app={currentApp}
          connection={connection}
          onAppDeleted={onAppDeleted}
          onRefreshConsoleData={onRefreshConsoleData}
        />
      )
  }
}

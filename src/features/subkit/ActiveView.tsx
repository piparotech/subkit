import { AppRouteNotFound } from './AppRouteNotFound'
import { AppSettingsView } from './AppSettingsView'
import { AppUsersView } from './AppUsersView'
import { AppsView } from './AppsView'
import { DashboardView } from './DashboardView'
import { EntitlementsView } from './EntitlementsView'
import { OfferingsView } from './OfferingsView'
import { SubscriptionsView } from './SubscriptionsView'
import { TenantMembersView } from './TenantMembersView'
import type {
  AppStoreConnectConnection,
  AppTenant,
  AppUser,
  ConsoleData,
  Entitlement,
  Offering,
  SubscriptionProduct,
  View,
} from './types'
import { WorkspaceSettingsView } from './WorkspaceSettingsView'

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

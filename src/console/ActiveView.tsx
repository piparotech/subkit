import { AppRouteNotFound } from '~/console/AppRouteNotFound'
import { AppSettingsView } from '~/integrations/app-store-connect/AppSettingsView'
import { AppUsersView } from '~/domain/app-users/AppUsersView'
import { AppsView } from '~/domain/apps/AppsView'
import { DashboardView } from '~/domain/dashboard/DashboardView'
import { EntitlementsView } from '~/domain/entitlements/EntitlementsView'
import { OfferingsView } from '~/domain/offerings/OfferingsView'
import { ProductsView } from '~/domain/products/ProductsView'
import { StoresView } from '~/domain/stores/StoresView'
import { TenantMembersView } from '~/domain/tenants/TenantMembersView'
import type { AppUser } from '~/domain/app-users/types'
import type { AppTenant } from '~/domain/apps/types'
import type { CatalogProduct } from '~/domain/products/types'
import type { Entitlement } from '~/domain/entitlements/types'
import type { Offering } from '~/domain/offerings/types'
import type { TenantMemberSummary } from '~/domain/tenants/types'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'
import type { ConsoleData, View } from '~/console/types'
import { WorkspaceSettingsView } from '~/integrations/app-store-connect/WorkspaceSettingsView'

export function ActiveView({
  appUsers,
  apps,
  canCreateApps,
  connection,
  consoleData,
  currentApp,
  tenant,
  tenantMembers,
  entitlements,
  isFiltering,
  offerings,
  onAppDeleted,
  onCreateApp,
  onOpenAppUser,
  onOpenProduct,
  onRefreshConsoleData,
  products,
  view,
}: {
  appUsers: AppUser[]
  apps: AppTenant[]
  canCreateApps: boolean
  connection: AppStoreConnectConnection | null
  consoleData: ConsoleData
  currentApp: AppTenant | null
  tenant: ConsoleData['tenant']
  tenantMembers: TenantMemberSummary[]
  entitlements: Entitlement[]
  isFiltering: boolean
  offerings: Offering[]
  onAppDeleted: (id: string) => void
  onCreateApp: () => void
  onOpenAppUser: (appUser: AppUser) => void
  onOpenProduct: (product: CatalogProduct) => void
  onRefreshConsoleData: () => void
  products: CatalogProduct[]
  view: View
}) {
  if (view === 'tenantMembers') {
    return <TenantMembersView isFiltering={isFiltering} onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} tenantMembers={tenantMembers} />
  }

  if (view === 'workspaceSettings') {
    return <WorkspaceSettingsView connection={connection} onRefreshConsoleData={onRefreshConsoleData} tenant={tenant} />
  }

  if (view === 'apps') {
    return (
      <AppsView
        apps={apps}
        canCreateApps={canCreateApps}
        connection={connection}
        isFiltering={isFiltering}
        onCreateApp={onCreateApp}
      />
    )
  }

  if (currentApp == null) return <AppRouteNotFound apps={apps} />

  switch (view) {
    case 'dashboard': {
      const dashboard = consoleData.dashboards.find((item) => item.appId === currentApp.id)
      if (dashboard == null) throw new Error('Dashboard data missing for selected app')
      return (
        <DashboardView
          activity={dashboard.activity}
          app={currentApp}
          metrics={dashboard.metrics}
          revenueBars={dashboard.revenueBars}
          runtime={consoleData.runtime}
        />
      )
    }
    case 'products':
      return <ProductsView isFiltering={isFiltering} onOpenProduct={onOpenProduct} products={products} />
    case 'stores': {
      const storeSync = consoleData.storeSync.find((item) => item.appId === currentApp.id)
      if (storeSync == null) throw new Error('Store sync data missing for selected app')
      return <StoresView storeSync={storeSync} />
    }
    case 'entitlements':
      return <EntitlementsView entitlements={entitlements} />
    case 'offerings':
      return <OfferingsView offerings={offerings} />
    case 'appUsers':
      return <AppUsersView appUsers={appUsers} isFiltering={isFiltering} onOpenAppUser={onOpenAppUser} />
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

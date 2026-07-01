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
  onOpenProduct,
  onRefreshConsoleData,
  appUsers,
  products,
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
  onOpenProduct: (product: CatalogProduct) => void
  onRefreshConsoleData: () => void
  appUsers: AppUser[]
  products: CatalogProduct[]
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
    case 'products':
      return <ProductsView onOpenProduct={onOpenProduct} products={products} />
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

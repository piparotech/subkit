import type { AppUser } from '~/domain/app-users/types'
import type { AppTenant } from '~/domain/apps/types'
import type { ConsoleRuntimeConfig, ConsoleStats, DashboardSummary } from '~/domain/dashboard/types'
import type { Entitlement } from '~/domain/entitlements/types'
import type { Offering } from '~/domain/offerings/types'
import type { CatalogProduct } from '~/domain/products/types'
import type { StoreSyncAppSummary } from '~/domain/stores/types'
import type { ConsoleUser, TenantMemberSummary, WorkspaceTenant } from '~/domain/tenants/types'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export interface ConsoleData {
  accessibleTenants: WorkspaceTenant[]
  appStoreConnect: AppStoreConnectConnection | null
  appStoreConnectConnections: AppStoreConnectConnection[]
  appUsers: AppUser[]
  apps: AppTenant[]
  currentUser: ConsoleUser
  dashboards: DashboardSummary[]
  entitlements: Entitlement[]
  offerings: Offering[]
  runtime: ConsoleRuntimeConfig
  stats: ConsoleStats
  storeSync: StoreSyncAppSummary[]
  products: CatalogProduct[]
  tenant: WorkspaceTenant
  tenantMembers: TenantMemberSummary[]
}

export interface ConsoleViewRenderProps {
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
}

export type AppConsoleViewRenderProps = Omit<ConsoleViewRenderProps, 'currentApp'> & {
  currentApp: AppTenant
}

export interface ConsolePrimaryAction {
  label: string
  onPress: () => void
}

export interface ConsoleActionContext {
  canCreateApps: boolean
  currentApp: AppTenant | null
  openAppCreator: () => void
  openProductCreator: () => void
}

export type ConsolePrimaryActionFactory = (context: ConsoleActionContext) => ConsolePrimaryAction | null

export type PanelState =
  | { kind: 'closed' }
  | { kind: 'newApp' }
  | { kind: 'newTenant' }
  | { kind: 'product'; mode: 'new' | 'edit'; product: CatalogProduct }
  | { appUser: AppUser; kind: 'appUser' }

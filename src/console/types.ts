import type { AppUser } from '~/domain/app-users/types'
import type { AppTenant } from '~/domain/apps/types'
import type { ConsoleRuntimeConfig, ConsoleStats, DashboardSummary } from '~/domain/dashboard/types'
import type { Entitlement } from '~/domain/entitlements/types'
import type { Offering } from '~/domain/offerings/types'
import type { SubscriptionProduct } from '~/domain/subscriptions/types'
import type { ConsoleUser, TenantMemberSummary, WorkspaceTenant } from '~/domain/tenants/types'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export type View =
  | 'apps'
  | 'tenantMembers'
  | 'workspaceSettings'
  | 'dashboard'
  | 'subscriptions'
  | 'entitlements'
  | 'offerings'
  | 'appUsers'
  | 'settings'

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
  subscriptions: SubscriptionProduct[]
  tenant: WorkspaceTenant
  tenantMembers: TenantMemberSummary[]
}

export type PanelState =
  | { kind: 'closed' }
  | { kind: 'newApp' }
  | { kind: 'newTenant' }
  | { kind: 'subscription'; mode: 'new' | 'edit'; originalIdentifier: string | null; subscription: SubscriptionProduct }
  | { appUser: AppUser; kind: 'appUser' }

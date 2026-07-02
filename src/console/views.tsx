import { useMatches } from '@tanstack/react-router'
import type { ComponentType, SVGProps } from 'react'

import { AppUsersIcon } from '~/console/icons/AppUsersIcon'
import { AppsIcon } from '~/console/icons/AppsIcon'
import { DashboardIcon } from '~/console/icons/DashboardIcon'
import { EntitlementsIcon } from '~/console/icons/EntitlementsIcon'
import { OfferingsIcon } from '~/console/icons/OfferingsIcon'
import { SettingsIcon } from '~/console/icons/SettingsIcon'
import { StoresIcon } from '~/console/icons/StoresIcon'
import { SubscriptionsIcon } from '~/console/icons/SubscriptionsIcon'
import type { AppUser } from '~/domain/app-users/types'
import type { AppTenant } from '~/domain/apps/types'
import type { CatalogProduct } from '~/domain/products/types'
import type { ConsoleData, View } from '~/console/types'
import type { Entitlement } from '~/domain/entitlements/types'
import type { Offering } from '~/domain/offerings/types'
import type { TenantMemberSummary } from '~/domain/tenants/types'
import type { AppStoreConnectConnection } from '~/integrations/app-store-connect/types'

export type WorkspaceConsoleView = Extract<View, 'apps' | 'tenantMembers' | 'workspaceSettings'>
export type AppConsoleView = Extract<View, 'dashboard' | 'products' | 'stores' | 'entitlements' | 'offerings' | 'appUsers' | 'settings'>

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
  view: View
}

export type AppConsoleViewRenderProps = Omit<ConsoleViewRenderProps, 'currentApp'> & {
  currentApp: AppTenant
}

interface ConsoleViewDefinition {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  navigationLabel: string
  scope: 'workspace' | 'app'
  searchPlaceholder: string | null
  to: string
}

export const consoleViews = {
  apps: {
    icon: AppsIcon,
    label: 'Apps',
    navigationLabel: 'Apps',
    scope: 'workspace',
    searchPlaceholder: 'Search apps…',
    to: '/apps',
  },
  tenantMembers: {
    icon: AppUsersIcon,
    label: 'Workspace Members',
    navigationLabel: 'Workspace Members',
    scope: 'workspace',
    searchPlaceholder: 'Search workspace members…',
    to: '/members',
  },
  workspaceSettings: {
    icon: SettingsIcon,
    label: 'Workspace Settings',
    navigationLabel: 'Workspace Settings',
    scope: 'workspace',
    searchPlaceholder: null,
    to: '/settings',
  },
  dashboard: {
    icon: DashboardIcon,
    label: 'Dashboard',
    navigationLabel: 'Overview',
    scope: 'app',
    searchPlaceholder: null,
    to: '/$tenantSlug/$appSlug',
  },
  products: {
    icon: SubscriptionsIcon,
    label: 'Products',
    navigationLabel: 'Products',
    scope: 'app',
    searchPlaceholder: 'Search products, plans, entitlements…',
    to: '/$tenantSlug/$appSlug/products',
  },
  stores: {
    icon: StoresIcon,
    label: 'Stores',
    navigationLabel: 'Store Sync',
    scope: 'app',
    searchPlaceholder: null,
    to: '/$tenantSlug/$appSlug/stores',
  },
  entitlements: {
    icon: EntitlementsIcon,
    label: 'Entitlements',
    navigationLabel: 'Entitlements',
    scope: 'app',
    searchPlaceholder: null,
    to: '/$tenantSlug/$appSlug/entitlements',
  },
  offerings: {
    icon: OfferingsIcon,
    label: 'Offerings',
    navigationLabel: 'Offerings',
    scope: 'app',
    searchPlaceholder: null,
    to: '/$tenantSlug/$appSlug/offerings',
  },
  appUsers: {
    icon: AppUsersIcon,
    label: 'App Users',
    navigationLabel: 'App Users',
    scope: 'app',
    searchPlaceholder: 'Search App Users, countries, entitlements…',
    to: '/$tenantSlug/$appSlug/app-users',
  },
  settings: {
    icon: SettingsIcon,
    label: 'Settings',
    navigationLabel: 'App Settings',
    scope: 'app',
    searchPlaceholder: null,
    to: '/$tenantSlug/$appSlug/settings',
  },
} satisfies Record<View, ConsoleViewDefinition>

export interface AppConsoleNavigationSection {
  label: string
  views: AppConsoleView[]
}

export const workspaceConsoleNavigation: WorkspaceConsoleView[] = ['apps', 'tenantMembers', 'workspaceSettings']

export const appConsoleNavigationSections: AppConsoleNavigationSection[] = [
  { label: 'State', views: ['dashboard', 'appUsers', 'entitlements'] },
  { label: 'Catalog', views: ['products', 'offerings'] },
  { label: 'Stores', views: ['stores'] },
  { label: 'Admin', views: ['settings'] },
]

export function consoleRouteData(view: View) {
  return { consoleView: view }
}

export function consoleViewLabel(view: View): string {
  return consoleViews[view].label
}

export function consoleViewSearchPlaceholder(view: View): string | null {
  return consoleViews[view].searchPlaceholder
}

function readConsoleView(staticData: unknown): View | null {
  if (!hasOptionalConsoleView(staticData)) return null
  const { consoleView } = staticData
  if (!isConsoleView(consoleView)) return null
  return consoleView
}

function hasOptionalConsoleView(value: unknown): value is { consoleView?: unknown } {
  return typeof value === 'object' && value !== null
}

function isConsoleView(value: unknown): value is View {
  return typeof value === 'string' && value in consoleViews
}

export function isAppConsoleView(view: View): view is AppConsoleView {
  return consoleViews[view].scope === 'app'
}

export function isWorkspaceConsoleView(view: View): view is WorkspaceConsoleView {
  return consoleViews[view].scope === 'workspace'
}

export function useActiveConsoleView(): View {
  const view = useMatches({
    select: (matches) => {
      for (let index = matches.length - 1; index >= 0; index -= 1) {
        const consoleView = readConsoleView(matches[index]?.staticData)
        if (consoleView != null) return consoleView
      }
      return null
    },
  })

  if (view == null) throw new Error('Console route is missing staticData.consoleView')
  return view
}

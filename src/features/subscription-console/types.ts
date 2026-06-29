export type View =
  | 'apps'
  | 'dashboard'
  | 'subscriptions'
  | 'entitlements'
  | 'offerings'
  | 'subscribers'
  | 'settings'

export type Platform = 'iOS' | 'Android'
export type StatusTone = 'success' | 'warning' | 'muted' | 'destructive'
export type AppStatusValue = 'live' | 'beta' | 'inactive'
export type Store = 'App Store' | 'Play Store'

export interface ConsoleUser {
  email?: string
  initials: string
  name: string
  organization: string
  operator: boolean
}

export interface WorkspaceTenant {
  id: string
  name: string
  initials: string
  color: string
}

export interface AppTenant {
  id: string
  tenantId: string
  name: string
  initials: string
  color: string
  bundle: string
  platforms: Platform[]
  mrr: string
  activeSubs: string
  status: string
  statusTone: StatusTone
}

export interface SubscriptionProduct {
  appId: string
  name: string
  identifier: string
  iosId: string
  androidId: string
  duration: string
  price: string
  activeSubs: string
  entitlement: string
  trial: string
  trialOn: boolean
}

export interface Entitlement {
  appId: string
  id: string
  description: string
  productCount: string
  products: string[]
}

export interface OfferingPackage {
  label: string
  productId: string
  price: string
  badge: string
  hasBadge: boolean
}

export interface Offering {
  appId: string
  id: string
  name: string
  desc: string
  tag: string
  tagTone: StatusTone
  packages: OfferingPackage[]
}

export interface PurchaseHistoryEvent {
  type: string
  date: string
  store: Store
  amount: string
  amountTone: StatusTone
}

export interface Subscriber {
  appId: string
  userId: string
  countryCode: string
  country: string
  plan: string
  status: string
  statusTone: StatusTone
  since: string
  ltv: string
  entitlement: string
  history: PurchaseHistoryEvent[]
}

export interface Metric {
  label: string
  value: string
  delta?: string
  tone?: StatusTone
}

export interface ConsoleStats {
  apps: number
  entitlements: number
  products: number
  purchaseEvents: number
  subscribers: number
  tenants: number
}

export interface RevenueBar {
  month: string
  height: string
}

export interface ActivityEvent {
  type: string
  user: string
  product: string
  amount: string
  amountTone: StatusTone
  time: string
  dotTone: StatusTone
}

export interface DashboardSummary {
  appId: string
  activity: ActivityEvent[]
  metrics: Metric[]
  revenueBars: RevenueBar[]
}

export interface ConsoleData {
  apps: AppTenant[]
  currentUser: ConsoleUser
  dashboards: DashboardSummary[]
  entitlements: Entitlement[]
  offerings: Offering[]
  stats: ConsoleStats
  subscribers: Subscriber[]
  subscriptions: SubscriptionProduct[]
  tenant: WorkspaceTenant
}

export interface AppDraft {
  name: string
  iosBundle: string
  androidPackage: string
  status: AppStatusValue | ''
}

export type AppDraftField = keyof AppDraft

export type EditableSubscriptionTextField =
  | 'name'
  | 'identifier'
  | 'iosId'
  | 'androidId'
  | 'duration'
  | 'price'
  | 'entitlement'
  | 'trial'

export type PanelState =
  | { kind: 'closed' }
  | { kind: 'newApp' }
  | { kind: 'subscription'; mode: 'new' | 'edit'; originalIdentifier: string | null; subscription: SubscriptionProduct }
  | { kind: 'subscriber'; subscriber: Subscriber }

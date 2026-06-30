export type View =
  | 'apps'
  | 'workspaceSettings'
  | 'dashboard'
  | 'subscriptions'
  | 'entitlements'
  | 'offerings'
  | 'subscribers'
  | 'settings'

export type Platform = 'iOS' | 'Android'
export type StatusTone = 'success' | 'warning' | 'muted' | 'destructive'
export type AppStatusValue = 'setup' | 'live' | 'beta' | 'inactive'
export type Store = 'App Store' | 'Play Store'

export interface ConsoleUser {
  email?: string
  id: string
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
  appleAppId: string | null
  iosBundleId: string | null
  androidPackageName: string | null
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

export type AppStoreConnectConnectionStatus = 'connected' | 'needs_attention' | 'invalid' | 'deleted'
export type AppStoreConnectCapabilityStatus = 'available' | 'missing' | 'unknown'
export type AppStoreConnectProductSyncAction = 'create' | 'update' | 'unchanged' | 'conflict'

export interface AppStoreConnectCapability {
  checkedAt: string
  description: string
  detail: string
  key: string
  label: string
  status: AppStoreConnectCapabilityStatus
}

export interface AppStoreConnectSalesReportSummary {
  createdAt: string
  errorDetail: string | null
  id: string
  reportDate: string
  rowCount: string
  status: 'imported' | 'failed'
  vendorNumber: string
}

export interface AppStoreConnectAuditEventSummary {
  action: string
  createdAt: string
  detail: string
  id: string
}

export interface AppStoreConnectConnection {
  auditEvents: AppStoreConnectAuditEventSummary[]
  capabilities: AppStoreConnectCapability[]
  hasPrivateKey: boolean
  id: string
  issuerId: string
  keyFingerprint: string | null
  keyId: string
  lastError: string | null
  lastValidatedAt: string | null
  salesReports: AppStoreConnectSalesReportSummary[]
  status: AppStoreConnectConnectionStatus
  tenantId: string
  vendorNumber: string | null
}

export interface AppStoreConnectCredentialDraft {
  issuerId: string
  keyId: string
  privateKey: string
  vendorNumber: string
}

export interface AppStoreConnectAccessibleApp {
  appleAppId: string
  bundleId: string
  name: string
  sku: string
}

export interface AppStoreConnectProductPreview {
  action: AppStoreConnectProductSyncAction
  appleName: string
  appleProductId: string
  appleState: string
  duration: string
  entitlement: string
  kind: 'subscription' | 'in_app_purchase'
  localIdentifier: string | null
  localName: string | null
  note: string
}

export interface AppStoreConnectImportResult {
  created: number
  skipped: number
  updated: number
}

export interface AppStoreConnectCatalogSyncResult extends AppStoreConnectImportResult {
  conflicts: number
  preview: AppStoreConnectProductPreview[]
  unchanged: number
}

export interface AppStoreConnectReportSyncResult {
  reportDate: string
  rowCount: number
  status: 'imported' | 'failed'
}

export interface AppStoreConnectMonitorItem {
  detail: string
  id: string
  label: string
  status: string
}

export interface AppStoreConnectMonitorSection {
  items: AppStoreConnectMonitorItem[]
  title: string
}

export interface AppStoreConnectMonitorSnapshot {
  checkedAt: string
  sections: AppStoreConnectMonitorSection[]
}

export interface ConsoleData {
  appStoreConnect: AppStoreConnectConnection | null
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
  appleAppId: string
  bundleId: string
  name: string
  sku: string
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

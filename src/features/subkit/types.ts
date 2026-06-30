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

export type Platform = 'iOS' | 'Android'
export type StatusTone = 'success' | 'warning' | 'muted' | 'destructive'
export type AppStatusValue = 'setup' | 'live' | 'beta' | 'inactive'
export type Store = 'App Store' | 'Play Store'
export type GlobalRole = 'user' | 'super_admin'
export type TenantRole = 'admin' | 'developer'
export type EntitlementGrantSource = 'apple' | 'google' | 'voucher' | 'promo' | 'manual' | 'lifetime' | 'migration'
export type EntitlementGrantStatus = 'active' | 'trialing' | 'billing_retry' | 'expired' | 'revoked'

export interface ConsoleUser {
  canCreateTenants: boolean
  email?: string
  globalRole: GlobalRole
  id: string
  initials: string
  name: string
  organization: string
  operator: boolean
}

export interface WorkspaceTenant {
  color: string
  id: string
  initials: string
  name: string
  role: TenantRole | 'super_admin'
}

export interface TenantMemberSummary {
  createdAt: string
  email: string | null
  globalRole: GlobalRole
  initials: string
  name: string
  organization: string
  role: TenantRole
  tenantId: string
  userId: string
}

export interface TenantDraft {
  color: string
  id: string
  initials: string
  name: string
}

export type TenantDraftField = keyof TenantDraft

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
  activeAppUsers: string
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
  activeAppUsers: string
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

export interface EntitlementGrantSummary {
  entitlement: string
  expiresAt: string
  id: string
  product: string
  source: string
  startsAt: string
  status: string
  statusTone: StatusTone
}

export interface AppUser {
  appId: string
  appUserId: string
  countryCode: string
  country: string
  createdAt: string
  grants: EntitlementGrantSummary[]
  history: PurchaseHistoryEvent[]
  lastSeenAt: string
  ltv: string
  primaryEntitlement: string
  primarySource: string
  status: string
  statusTone: StatusTone
}

export interface Metric {
  label: string
  value: string
  delta?: string
  tone?: StatusTone
}

export interface ConsoleStats {
  appUsers: number
  apps: number
  entitlements: number
  products: number
  purchaseEvents: number
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
  accessibleTenants: WorkspaceTenant[]
  appStoreConnect: AppStoreConnectConnection | null
  appStoreConnectConnections: AppStoreConnectConnection[]
  appUsers: AppUser[]
  apps: AppTenant[]
  currentUser: ConsoleUser
  dashboards: DashboardSummary[]
  entitlements: Entitlement[]
  offerings: Offering[]
  stats: ConsoleStats
  subscriptions: SubscriptionProduct[]
  tenant: WorkspaceTenant
  tenantMembers: TenantMemberSummary[]
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
  | { kind: 'newTenant' }
  | { kind: 'subscription'; mode: 'new' | 'edit'; originalIdentifier: string | null; subscription: SubscriptionProduct }
  | { appUser: AppUser; kind: 'appUser' }

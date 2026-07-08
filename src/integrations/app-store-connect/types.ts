export type AppStoreConnectConnectionStatus =
  'connected' | 'needs_attention' | 'invalid' | 'deleted'
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

export interface AppStoreConnectTenantSyncResult {
  appsCreated: number
  appsFailed: number
  appsFound: number
  appsSynced: number
  appsUpdated: number
  productsConflicts: number
  productsCreated: number
  productsSkipped: number
  productsUnchanged: number
  productsUpdated: number
  salesReport: AppStoreConnectReportSyncResult | null
}

export interface AppStoreConnectCredentialSaveResult {
  ok: true
  sync: AppStoreConnectTenantSyncResult
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

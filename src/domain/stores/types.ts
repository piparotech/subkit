export type StoreSyncStore = 'apple' | 'google'
export type StoreBindingStatus =
  | 'planned'
  | 'linked'
  | 'synced'
  | 'drifted'
  | 'missing_in_store'
  | 'missing_in_subkit'
  | 'unsupported'
  | 'archived'
export type StoreSyncDirection = 'subkit_to_store' | 'store_to_subkit' | 'manual'
export type StoreDriftSeverity = 'info' | 'warning' | 'blocking'
export type StoreDriftStatus = 'open' | 'acknowledged' | 'resolved' | 'ignored'
export type StoreSyncRunStatus = 'running' | 'succeeded' | 'failed' | 'partial' | 'cancelled'
export type StoreSyncRunMode = 'import' | 'compare' | 'plan' | 'apply' | 'verify' | 'sales_import'
export type StoreMutationPlanStatus =
  | 'draft'
  | 'ready'
  | 'confirmation_required'
  | 'confirmed'
  | 'applying'
  | 'verifying'
  | 'applied'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'superseded'
export type StoreMutationRisk = 'none' | 'low' | 'medium' | 'high' | 'irreversible'

export interface StoreSyncIntegrationSummary {
  displayName: string
  externalAppId: string | null
  id: string
  lastSyncAt: string
  status: string
  store: StoreSyncStore
}

export interface StoreSyncBindingSummary {
  appId: string
  bindingStatus: StoreBindingStatus
  environment: string
  externalBasePlanId: string
  externalProductId: string
  id: string
  lastComparedAt: string
  planKey: string
  productKey: string
  store: StoreSyncStore
  syncDirection: StoreSyncDirection
}

export interface StoreSyncDriftSummary {
  actual: string
  bindingLabel: string
  detectedAt: string
  driftType: string
  expected: string
  fieldPath: string
  id: string
  severity: StoreDriftSeverity
  status: StoreDriftStatus
}

export interface StoreCatalogSnapshotSummary {
  contentHash: string
  externalId: string
  fetchedAt: string
  id: string
  objectType: string
  store: StoreSyncStore
}

export interface StoreSyncRunSummary {
  errorDetail: string | null
  finishedAt: string
  id: string
  mode: StoreSyncRunMode
  startedAt: string
  status: StoreSyncRunStatus
  store: StoreSyncStore
  summary: string
}

export interface StoreMutationPlanSummary {
  createdAt: string
  id: string
  previewHash: string
  risk: StoreMutationRisk
  status: StoreMutationPlanStatus
  store: StoreSyncStore
  summary: string
}

export interface StoreSyncAppSummary {
  appId: string
  bindings: StoreSyncBindingSummary[]
  driftItems: StoreSyncDriftSummary[]
  integrations: StoreSyncIntegrationSummary[]
  mutationPlans: StoreMutationPlanSummary[]
  snapshots: StoreCatalogSnapshotSummary[]
  syncRuns: StoreSyncRunSummary[]
}

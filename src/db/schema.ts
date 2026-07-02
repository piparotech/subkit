import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  initials: text('initials').notNull(),
  color: text('color').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email'),
    name: text('name').notNull(),
    organization: text('organization').notNull(),
    initials: text('initials').notNull(),
    operator: integer('operator', { mode: 'boolean' }).notNull().default(false),
    globalRole: text('global_role', { enum: ['user', 'super_admin'] }).notNull().default('user'),
    zitadelSubject: text('zitadel_subject'),
    zitadelLoginName: text('zitadel_login_name'),
    identityProvider: text('identity_provider'),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
    disabledAt: integer('disabled_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    uniqueIndex('users_zitadel_subject_unique').on(table.zitadelSubject),
  ],
)

export const userTenants = sqliteTable(
  'user_tenants',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['admin', 'developer'] }).notNull(),
    invitedByUserId: text('invited_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.tenantId] })],
)

export const authSessions = sqliteTable(
  'auth_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
    userAgent: text('user_agent'),
    ipHash: text('ip_hash'),
  },
  (table) => [
    uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash),
    index('auth_sessions_user_expires_idx').on(table.userId, table.expiresAt),
  ],
)

export const authEvents = sqliteTable('auth_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  detail: text('detail').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
})

export const apps = sqliteTable('apps', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  initials: text('initials').notNull(),
  color: text('color').notNull(),
  bundleId: text('bundle_id').notNull().default(''),
  appleAppId: text('apple_app_id'),
  iosBundleId: text('ios_bundle_id'),
  androidPackageName: text('android_package_name'),
  status: text('status', { enum: ['setup', 'live', 'beta', 'inactive'] }).notNull().default('setup'),
  monthlyRevenueCents: integer('monthly_revenue_cents').notNull().default(0),
  activeAppUserCount: integer('active_app_user_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const appRuntimeSdkKeys = sqliteTable(
  'app_runtime_sdk_keys',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    name: text('name').notNull(),
    scopes: text('scopes', { mode: 'json' }).$type<string[]>().notNull(),
    status: text('status', { enum: ['active', 'revoked'] }).notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
  },
  (table) => [uniqueIndex('app_runtime_sdk_keys_key_hash_unique').on(table.keyHash)],
)

export const appPlatforms = sqliteTable(
  'app_platforms',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    platform: text('platform', { enum: ['ios', 'android'] }).notNull(),
    store: text('store', { enum: ['apple', 'google'] }).notNull(),
    bundleId: text('bundle_id'),
    packageName: text('package_name'),
    storeAppId: text('store_app_id'),
    environment: text('environment', { enum: ['production', 'sandbox', 'internal', 'unknown'] }).notNull().default('unknown'),
    status: text('status', { enum: ['connected', 'needs_setup', 'disabled'] }).notNull().default('needs_setup'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('app_platforms_app_store_environment_unique').on(table.appId, table.store, table.environment)],
)

export const storeIntegrations = sqliteTable(
  'store_integrations',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    appPlatformId: text('app_platform_id').references(() => appPlatforms.id, { onDelete: 'set null' }),
    store: text('store', { enum: ['apple', 'google'] }).notNull(),
    displayName: text('display_name').notNull(),
    status: text('status', { enum: ['connected', 'needs_auth', 'disabled', 'error'] }).notNull().default('needs_auth'),
    externalAppId: text('external_app_id'),
    configJson: text('config_json'),
    capabilitiesJson: text('capabilities_json'),
    lastPermissionCheckAt: integer('last_permission_check_at', { mode: 'timestamp_ms' }),
    lastSyncAt: integer('last_sync_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('store_integrations_app_store_unique').on(table.appId, table.store)],
)

export const appStoreConnectCredentials = sqliteTable(
  'app_store_connect_credentials',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    keyId: text('key_id').notNull(),
    issuerId: text('issuer_id').notNull(),
    vendorNumber: text('vendor_number'),
    privateKeyCiphertext: text('private_key_ciphertext'),
    privateKeyIv: text('private_key_iv'),
    privateKeyAuthTag: text('private_key_auth_tag'),
    privateKeySha256: text('private_key_sha256'),
    status: text('status', { enum: ['connected', 'needs_attention', 'invalid', 'deleted'] }).notNull().default('needs_attention'),
    lastValidatedAt: integer('last_validated_at', { mode: 'timestamp_ms' }),
    lastError: text('last_error'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    disabledAt: integer('disabled_at', { mode: 'timestamp_ms' }),
  },
  (table) => [uniqueIndex('app_store_connect_credentials_tenant_id_unique').on(table.tenantId)],
)

export const appStoreConnectCapabilities = sqliteTable(
  'app_store_connect_capabilities',
  {
    id: text('id').primaryKey(),
    credentialId: text('credential_id')
      .notNull()
      .references(() => appStoreConnectCredentials.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    description: text('description').notNull(),
    status: text('status', { enum: ['available', 'missing', 'unknown'] }).notNull(),
    detail: text('detail').notNull(),
    checkedAt: integer('checked_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('app_store_connect_capabilities_credential_key_unique').on(table.credentialId, table.key)],
)

export const appStoreConnectSalesReports = sqliteTable(
  'app_store_connect_sales_reports',
  {
    id: text('id').primaryKey(),
    credentialId: text('credential_id')
      .notNull()
      .references(() => appStoreConnectCredentials.id, { onDelete: 'cascade' }),
    appId: text('app_id').references(() => apps.id, { onDelete: 'cascade' }),
    vendorNumber: text('vendor_number').notNull(),
    reportDate: text('report_date').notNull(),
    status: text('status', { enum: ['imported', 'failed'] }).notNull(),
    rowCount: integer('row_count').notNull().default(0),
    rawText: text('raw_text'),
    errorDetail: text('error_detail'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('app_store_connect_sales_reports_credential_created_idx').on(table.credentialId, table.createdAt)],
)

export const appStoreConnectAuditEvents = sqliteTable(
  'app_store_connect_audit_events',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    appId: text('app_id').references(() => apps.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').references(() => appStoreConnectCredentials.id, { onDelete: 'set null' }),
    actorUserId: text('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    detail: text('detail').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('app_store_connect_audit_events_credential_created_idx').on(table.credentialId, table.createdAt),
    index('app_store_connect_audit_events_tenant_created_idx').on(table.tenantId, table.createdAt),
  ],
)

export const entitlements = sqliteTable(
  'entitlements',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull().default(''),
    description: text('description').notNull(),
    status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('entitlements_app_key_unique').on(table.appId, table.key)],
)

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    productType: text('product_type', { enum: ['subscription', 'non_consumable', 'consumable', 'voucher', 'manual'] }).notNull().default('subscription'),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull().default('active'),
    activeAppUserCount: integer('active_app_user_count').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('products_app_key_unique').on(table.appId, table.key)],
)

export const productEntitlements = sqliteTable(
  'product_entitlements',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    entitlementId: text('entitlement_id')
      .notNull()
      .references(() => entitlements.id, { onDelete: 'restrict' }),
    grantMode: text('grant_mode', { enum: ['while_active', 'lifetime', 'fixed_duration'] }).notNull().default('while_active'),
    durationIso: text('duration_iso'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('product_entitlements_product_entitlement_unique').on(table.productId, table.entitlementId)],
)

export const productPlans = sqliteTable(
  'product_plans',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    billingKind: text('billing_kind', { enum: ['recurring', 'one_time'] }).notNull(),
    billingPeriodIso: text('billing_period_iso'),
    gracePeriodIso: text('grace_period_iso'),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('product_plans_product_key_unique').on(table.productId, table.key)],
)

export const prices = sqliteTable(
  'prices',
  {
    id: text('id').primaryKey(),
    productPlanId: text('product_plan_id')
      .notNull()
      .references(() => productPlans.id, { onDelete: 'cascade' }),
    currencyCode: text('currency_code').notNull(),
    countryCode: text('country_code'),
    amountMicros: integer('amount_micros').notNull(),
    taxInclusive: integer('tax_inclusive', { mode: 'boolean' }),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('prices_plan_currency_country_unique').on(table.productPlanId, table.currencyCode, table.countryCode)],
)

export const productOffers = sqliteTable(
  'product_offers',
  {
    id: text('id').primaryKey(),
    productPlanId: text('product_plan_id')
      .notNull()
      .references(() => productPlans.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    offerType: text('offer_type', { enum: ['free_trial', 'intro_price', 'promo', 'winback', 'custom_code'] }).notNull(),
    eligibility: text('eligibility', { enum: ['new_customers', 'lapsed', 'existing', 'all', 'store_managed'] }).notNull().default('new_customers'),
    durationIso: text('duration_iso'),
    billingPeriodCount: integer('billing_period_count'),
    priceAmountMicros: integer('price_amount_micros'),
    priceCurrencyCode: text('price_currency_code'),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull().default('active'),
    startsAt: integer('starts_at', { mode: 'timestamp_ms' }),
    endsAt: integer('ends_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex('product_offers_plan_key_unique').on(table.productPlanId, table.key)],
)

export const storeProductBindings = sqliteTable(
  'store_product_bindings',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    appPlatformId: text('app_platform_id').references(() => appPlatforms.id, { onDelete: 'set null' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    productPlanId: text('product_plan_id')
      .notNull()
      .references(() => productPlans.id, { onDelete: 'cascade' }),
    storeIntegrationId: text('store_integration_id').references(() => storeIntegrations.id, { onDelete: 'set null' }),
    store: text('store', { enum: ['apple', 'google'] }).notNull(),
    externalProductId: text('external_product_id').notNull(),
    externalBasePlanId: text('external_base_plan_id').notNull().default(''),
    externalSubscriptionGroupId: text('external_subscription_group_id'),
    externalPackageName: text('external_package_name'),
    environment: text('environment', { enum: ['production', 'sandbox', 'unknown'] }).notNull().default('production'),
    bindingStatus: text('binding_status', {
      enum: ['planned', 'linked', 'synced', 'drifted', 'missing_in_store', 'missing_in_subkit', 'unsupported', 'archived'],
    })
      .notNull()
      .default('linked'),
    syncDirection: text('sync_direction', { enum: ['subkit_to_store', 'store_to_subkit', 'manual'] }).notNull().default('subkit_to_store'),
    lastSnapshotId: text('last_snapshot_id'),
    lastComparedAt: integer('last_compared_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex('store_product_bindings_store_product_unique').on(table.appId, table.store, table.externalProductId, table.externalBasePlanId, table.environment),
  ],
)

export const storeCatalogSnapshots = sqliteTable('store_catalog_snapshots', {
  id: text('id').primaryKey(),
  appPlatformId: text('app_platform_id').references(() => appPlatforms.id, { onDelete: 'set null' }),
  store: text('store', { enum: ['apple', 'google'] }).notNull(),
  syncRunId: text('sync_run_id'),
  externalId: text('external_id').notNull(),
  externalParentId: text('external_parent_id'),
  objectType: text('object_type', { enum: ['app', 'subscription_group', 'subscription', 'base_plan', 'in_app_product', 'price', 'offer', 'localization'] }).notNull(),
  environment: text('environment', { enum: ['production', 'sandbox', 'unknown'] }).notNull().default('production'),
  rawJson: text('raw_json').notNull(),
  normalizedJson: text('normalized_json').notNull(),
  contentHash: text('content_hash').notNull(),
  fetchedAt: integer('fetched_at', { mode: 'timestamp_ms' }).notNull(),
})

export const storeCatalogDriftItems = sqliteTable('store_catalog_drift_items', {
  id: text('id').primaryKey(),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  storeProductBindingId: text('store_product_binding_id').references(() => storeProductBindings.id, { onDelete: 'set null' }),
  snapshotId: text('snapshot_id').references(() => storeCatalogSnapshots.id, { onDelete: 'set null' }),
  severity: text('severity', { enum: ['info', 'warning', 'blocking'] }).notNull(),
  fieldPath: text('field_path').notNull(),
  expectedJson: text('expected_json'),
  actualJson: text('actual_json'),
  driftType: text('drift_type', {
    enum: ['missing_in_store', 'missing_in_subkit', 'value_mismatch', 'unsupported_store_state', 'manual_store_change', 'stale_snapshot', 'immutable_mismatch', 'lifecycle_blocked'],
  }).notNull(),
  status: text('status', { enum: ['open', 'acknowledged', 'resolved', 'ignored'] }).notNull().default('open'),
  detectedAt: integer('detected_at', { mode: 'timestamp_ms' }).notNull(),
  resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
})

export const syncRuns = sqliteTable('sync_runs', {
  id: text('id').primaryKey(),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  appPlatformId: text('app_platform_id').references(() => appPlatforms.id, { onDelete: 'set null' }),
  store: text('store', { enum: ['apple', 'google'] }).notNull(),
  mode: text('mode', { enum: ['import', 'compare', 'plan', 'apply', 'verify', 'sales_import'] }).notNull(),
  status: text('status', { enum: ['running', 'succeeded', 'failed', 'partial', 'cancelled'] }).notNull(),
  startedByUserId: text('started_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  finishedAt: integer('finished_at', { mode: 'timestamp_ms' }),
  summaryJson: text('summary_json'),
  errorDetail: text('error_detail'),
})

export const storeMutationPlans = sqliteTable('store_mutation_plans', {
  id: text('id').primaryKey(),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  appPlatformId: text('app_platform_id').references(() => appPlatforms.id, { onDelete: 'set null' }),
  store: text('store', { enum: ['apple', 'google'] }).notNull(),
  status: text('status', {
    enum: ['draft', 'ready', 'confirmation_required', 'confirmed', 'applying', 'verifying', 'applied', 'partial', 'failed', 'cancelled', 'expired', 'superseded'],
  }).notNull(),
  createdByUserId: text('created_by_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  confirmedByUserId: text('confirmed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
  appliedAt: integer('applied_at', { mode: 'timestamp_ms' }),
  baseRemoteSnapshotHash: text('base_remote_snapshot_hash').notNull(),
  localRevision: text('local_revision').notNull(),
  previewHash: text('preview_hash').notNull(),
  summaryJson: text('summary_json').notNull(),
  risk: text('risk', { enum: ['none', 'low', 'medium', 'high', 'irreversible'] }).notNull().default('none'),
})

export const storeMutationPlanItems = sqliteTable('store_mutation_plan_items', {
  id: text('id').primaryKey(),
  planId: text('plan_id')
    .notNull()
    .references(() => storeMutationPlans.id, { onDelete: 'cascade' }),
  storeProductBindingId: text('store_product_binding_id').references(() => storeProductBindings.id, { onDelete: 'set null' }),
  operation: text('operation', {
    enum: ['create_product', 'update_product', 'archive_product', 'create_price', 'update_price', 'create_offer', 'update_offer', 'link_existing', 'unlink', 'no_op'],
  }).notNull(),
  objectType: text('object_type').notNull(),
  externalId: text('external_id'),
  beforeJson: text('before_json'),
  afterJson: text('after_json').notNull(),
  diffJson: text('diff_json').notNull(),
  risk: text('risk', { enum: ['low', 'medium', 'high', 'irreversible'] }).notNull(),
  status: text('status', { enum: ['planned', 'applied', 'failed', 'skipped', 'blocked'] }).notNull().default('planned'),
  errorDetail: text('error_detail'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const offerings = sqliteTable('offerings', {
  id: text('id').primaryKey(),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  tag: text('tag').notNull(),
  tagTone: text('tag_tone', { enum: ['success', 'warning', 'muted', 'destructive'] }).notNull().default('muted'),
})

export const offeringPackages = sqliteTable(
  'offering_packages',
  {
    id: text('id').primaryKey(),
    offeringId: text('offering_id')
      .notNull()
      .references(() => offerings.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    label: text('label').notNull(),
    productPlanId: text('product_plan_id')
      .notNull()
      .references(() => productPlans.id, { onDelete: 'restrict' }),
    badge: text('badge').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [uniqueIndex('offering_packages_offering_key_unique').on(table.offeringId, table.key)],
)

export const appUsers = sqliteTable(
  'app_users',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    appUserId: text('app_user_id').notNull(),
    countryCode: text('country_code').notNull().default('XX'),
    country: text('country').notNull().default('Unknown'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }),
  },
  (table) => [uniqueIndex('app_users_app_user_id_unique').on(table.appId, table.appUserId)],
)

export const appUserAliases = sqliteTable(
  'app_user_aliases',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    appUserId: text('app_user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('app_user_aliases_app_alias_unique').on(table.appId, table.alias)],
)

export const appUserStoreIdentities = sqliteTable(
  'app_user_store_identities',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    appUserId: text('app_user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    store: text('store', { enum: ['apple', 'google'] }).notNull(),
    appAccountToken: text('app_account_token'),
    obfuscatedAccountId: text('obfuscated_account_id'),
    obfuscatedProfileId: text('obfuscated_profile_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('app_user_store_identities_user_store_unique').on(table.appId, table.appUserId, table.store),
    uniqueIndex('app_user_store_identities_apple_token_unique').on(table.appId, table.appAccountToken),
    uniqueIndex('app_user_store_identities_google_account_unique').on(table.appId, table.obfuscatedAccountId),
  ],
)

export const entitlementGrants = sqliteTable(
  'entitlement_grants',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    appUserId: text('app_user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    entitlementId: text('entitlement_id')
      .notNull()
      .references(() => entitlements.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    productPlanId: text('product_plan_id').references(() => productPlans.id, { onDelete: 'set null' }),
    storeProductBindingId: text('store_product_binding_id').references(() => storeProductBindings.id, { onDelete: 'set null' }),
    storePurchaseId: text('store_purchase_id'),
    ownershipSource: text('ownership_source', {
      enum: ['direct_app_user', 'app_account_token', 'obfuscated_account_id', 'claimed_restore', 'manual_admin', 'unowned'],
    })
      .notNull()
      .default('direct_app_user'),
    source: text('source', { enum: ['apple', 'google', 'voucher', 'promo', 'manual', 'lifetime', 'migration'] }).notNull(),
    status: text('status', { enum: ['active', 'trialing', 'billing_retry', 'expired', 'revoked'] }).notNull(),
    startsAt: text('starts_at').notNull(),
    expiresAt: text('expires_at'),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    note: text('note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('entitlement_grants_app_user_idx').on(table.appId, table.appUserId)],
)

export const storePurchaseOwnerships = sqliteTable(
  'store_purchase_ownerships',
  {
    id: text('id').primaryKey(),
    appId: text('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),
    appUserId: text('app_user_id')
      .notNull()
      .references(() => appUsers.id, { onDelete: 'cascade' }),
    productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
    productPlanId: text('product_plan_id').references(() => productPlans.id, { onDelete: 'set null' }),
    storeProductBindingId: text('store_product_binding_id').references(() => storeProductBindings.id, { onDelete: 'set null' }),
    entitlementGrantId: text('entitlement_grant_id').references(() => entitlementGrants.id, { onDelete: 'set null' }),
    store: text('store', { enum: ['apple', 'google'] }).notNull(),
    productIdentifier: text('product_identifier').notNull(),
    transactionId: text('transaction_id').notNull(),
    originalTransactionId: text('original_transaction_id').notNull(),
    environment: text('environment', { enum: ['sandbox', 'production', 'unknown'] }).notNull().default('unknown'),
    ownershipType: text('ownership_type', { enum: ['purchased', 'family_shared', 'unknown'] }).notNull().default('unknown'),
    purchaseTokenHash: text('purchase_token_hash'),
    receiptHash: text('receipt_hash'),
    status: text('status', { enum: ['active', 'trialing', 'billing_retry', 'expired', 'revoked', 'pending'] }).notNull().default('pending'),
    purchasedAt: text('purchased_at').notNull(),
    expiresAt: text('expires_at'),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    rawPayloadJson: text('raw_payload_json'),
    lastReconciledAt: integer('last_reconciled_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('store_purchase_ownerships_store_original_unique').on(table.appId, table.store, table.originalTransactionId),
    uniqueIndex('store_purchase_ownerships_store_transaction_unique').on(table.appId, table.store, table.transactionId),
    index('store_purchase_ownerships_app_user_idx').on(table.appId, table.appUserId),
  ],
)

export const runtimeReconcileEvents = sqliteTable('runtime_reconcile_events', {
  id: text('id').primaryKey(),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  appUserId: text('app_user_id').references(() => appUsers.id, { onDelete: 'set null' }),
  storePurchaseOwnershipId: text('store_purchase_ownership_id').references(() => storePurchaseOwnerships.id, { onDelete: 'set null' }),
  store: text('store', { enum: ['apple', 'google'] }).notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export const purchaseEvents = sqliteTable('purchase_events', {
  id: text('id').primaryKey(),
  appUserId: text('app_user_id')
    .notNull()
    .references(() => appUsers.id, { onDelete: 'cascade' }),
  entitlementGrantId: text('entitlement_grant_id').references(() => entitlementGrants.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  occurredOn: text('occurred_on').notNull(),
  store: text('store', { enum: ['App Store', 'Play Store'] }).notNull(),
  amountCents: integer('amount_cents'),
})




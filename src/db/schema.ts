import { integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

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
  (table) => [uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash)],
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

export const appStoreConnectSalesReports = sqliteTable('app_store_connect_sales_reports', {
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
})

export const appStoreConnectAuditEvents = sqliteTable('app_store_connect_audit_events', {
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
})

export const entitlements = sqliteTable('entitlements', {
  id: text('id').primaryKey(),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  description: text('description').notNull(),
})

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull(),
  identifier: text('identifier').notNull(),
  appStoreId: text('app_store_id').notNull(),
  playStoreId: text('play_store_id').notNull(),
  duration: text('duration').notNull(),
  priceCents: integer('price_cents').notNull(),
  activeAppUserCount: integer('active_app_user_count').notNull().default(0),
  entitlementId: text('entitlement_id')
    .notNull()
    .references(() => entitlements.id, { onDelete: 'restrict' }),
  trialEnabled: integer('trial_enabled', { mode: 'boolean' }).notNull().default(false),
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

export const offeringPackages = sqliteTable('offering_packages', {
  id: text('id').primaryKey(),
  offeringId: text('offering_id')
    .notNull()
    .references(() => offerings.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  productId: text('product_id').notNull(),
  priceLabel: text('price_label').notNull(),
  badge: text('badge').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
})

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

export const entitlementGrants = sqliteTable('entitlement_grants', {
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
  source: text('source', { enum: ['apple', 'google', 'voucher', 'promo', 'manual', 'lifetime', 'migration'] }).notNull(),
  status: text('status', { enum: ['active', 'trialing', 'billing_retry', 'expired', 'revoked'] }).notNull(),
  startsAt: text('starts_at').notNull(),
  expiresAt: text('expires_at'),
  revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
  note: text('note'),
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




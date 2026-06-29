import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

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
  bundleId: text('bundle_id').notNull(),
  iosBundleId: text('ios_bundle_id'),
  androidPackageName: text('android_package_name'),
  status: text('status', { enum: ['live', 'beta', 'inactive'] }).notNull().default('live'),
  monthlyRevenueCents: integer('monthly_revenue_cents').notNull().default(0),
  activeSubscriberCount: integer('active_subscriber_count').notNull().default(0),
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
  activeSubscriberCount: integer('active_subscriber_count').notNull().default(0),
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

export const subscribers = sqliteTable('subscribers', {
  id: text('id').primaryKey(),
  appId: text('app_id')
    .notNull()
    .references(() => apps.id, { onDelete: 'cascade' }),
  appUserId: text('app_user_id').notNull(),
  countryCode: text('country_code').notNull(),
  country: text('country').notNull(),
  plan: text('plan').notNull(),
  status: text('status', { enum: ['active', 'trial', 'billing_retry', 'expired'] }).notNull(),
  subscriberSince: text('subscriber_since').notNull(),
  lifetimeValueCents: integer('lifetime_value_cents').notNull().default(0),
  entitlementId: text('entitlement_id').references(() => entitlements.id, { onDelete: 'set null' }),
})

export const purchaseEvents = sqliteTable('purchase_events', {
  id: text('id').primaryKey(),
  subscriberId: text('subscriber_id')
    .notNull()
    .references(() => subscribers.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  occurredOn: text('occurred_on').notNull(),
  store: text('store', { enum: ['App Store', 'Play Store'] }).notNull(),
  amountCents: integer('amount_cents'),
})

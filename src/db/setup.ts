import { createServerFn } from '@tanstack/react-start'
import { eq, sql } from 'drizzle-orm'

import { parseServerEnv } from '~/server/env'

import { db, dbClient } from './client'
import { tenants } from './schema'

const migrationSql = `
CREATE TABLE IF NOT EXISTS tenants (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  initials text NOT NULL,
  color text NOT NULL,
  created_at integer NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY NOT NULL,
  email text,
  name text NOT NULL,
  organization text NOT NULL,
  initials text NOT NULL,
  operator integer DEFAULT false NOT NULL,
  zitadel_subject text,
  zitadel_login_name text,
  identity_provider text,
  last_login_at integer,
  disabled_at integer,
  created_at integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_zitadel_subject_unique ON users(zitadel_subject);
CREATE TABLE IF NOT EXISTS auth_sessions (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES users(id) ON DELETE cascade,
  token_hash text NOT NULL,
  created_at integer NOT NULL,
  expires_at integer NOT NULL,
  last_seen_at integer NOT NULL,
  user_agent text,
  ip_hash text
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_hash_unique ON auth_sessions(token_hash);
CREATE TABLE IF NOT EXISTS auth_events (
  id text PRIMARY KEY NOT NULL,
  user_id text REFERENCES users(id) ON DELETE set null,
  type text NOT NULL,
  detail text NOT NULL,
  created_at integer NOT NULL
);
CREATE TABLE IF NOT EXISTS apps (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE cascade,
  name text NOT NULL,
  initials text NOT NULL,
  color text NOT NULL,
  bundle_id text DEFAULT '' NOT NULL,
  apple_app_id text,
  ios_bundle_id text,
  android_package_name text,
  status text DEFAULT 'setup' NOT NULL,
  monthly_revenue_cents integer DEFAULT 0 NOT NULL,
  active_subscriber_count integer DEFAULT 0 NOT NULL,
  created_at integer NOT NULL
);
CREATE TABLE IF NOT EXISTS app_store_connect_credentials (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE cascade,
  key_id text NOT NULL,
  issuer_id text NOT NULL,
  vendor_number text,
  private_key_ciphertext text,
  private_key_iv text,
  private_key_auth_tag text,
  private_key_sha256 text,
  status text DEFAULT 'needs_attention' NOT NULL,
  last_validated_at integer,
  last_error text,
  created_at integer NOT NULL,
  updated_at integer NOT NULL,
  disabled_at integer
);
CREATE TABLE IF NOT EXISTS app_store_connect_capabilities (
  id text PRIMARY KEY NOT NULL,
  credential_id text NOT NULL REFERENCES app_store_connect_credentials(id) ON DELETE cascade,
  key text NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  status text NOT NULL,
  detail text NOT NULL,
  checked_at integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS app_store_connect_capabilities_credential_key_unique ON app_store_connect_capabilities(credential_id, key);
CREATE TABLE IF NOT EXISTS app_store_connect_sales_reports (
  id text PRIMARY KEY NOT NULL,
  credential_id text NOT NULL REFERENCES app_store_connect_credentials(id) ON DELETE cascade,
  app_id text REFERENCES apps(id) ON DELETE cascade,
  vendor_number text NOT NULL,
  report_date text NOT NULL,
  status text NOT NULL,
  row_count integer DEFAULT 0 NOT NULL,
  raw_text text,
  error_detail text,
  created_at integer NOT NULL
);
CREATE TABLE IF NOT EXISTS app_store_connect_audit_events (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE cascade,
  app_id text REFERENCES apps(id) ON DELETE cascade,
  credential_id text REFERENCES app_store_connect_credentials(id) ON DELETE set null,
  actor_user_id text REFERENCES users(id) ON DELETE set null,
  action text NOT NULL,
  detail text NOT NULL,
  created_at integer NOT NULL
);
CREATE TABLE IF NOT EXISTS entitlements (
  id text PRIMARY KEY NOT NULL,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE cascade,
  key text NOT NULL,
  description text NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY NOT NULL,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE cascade,
  display_name text NOT NULL,
  identifier text NOT NULL,
  app_store_id text NOT NULL,
  play_store_id text NOT NULL,
  duration text NOT NULL,
  price_cents integer NOT NULL,
  active_subscriber_count integer DEFAULT 0 NOT NULL,
  entitlement_id text NOT NULL REFERENCES entitlements(id) ON DELETE restrict,
  trial_enabled integer DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS offerings (
  id text PRIMARY KEY NOT NULL,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE cascade,
  key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  tag text NOT NULL,
  tag_tone text DEFAULT 'muted' NOT NULL
);
CREATE TABLE IF NOT EXISTS offering_packages (
  id text PRIMARY KEY NOT NULL,
  offering_id text NOT NULL REFERENCES offerings(id) ON DELETE cascade,
  label text NOT NULL,
  product_id text NOT NULL,
  price_label text NOT NULL,
  badge text DEFAULT '' NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL
);
CREATE TABLE IF NOT EXISTS subscribers (
  id text PRIMARY KEY NOT NULL,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE cascade,
  app_user_id text NOT NULL,
  country_code text NOT NULL,
  country text NOT NULL,
  plan text NOT NULL,
  status text NOT NULL,
  subscriber_since text NOT NULL,
  lifetime_value_cents integer DEFAULT 0 NOT NULL,
  entitlement_id text REFERENCES entitlements(id) ON DELETE set null
);
CREATE TABLE IF NOT EXISTS purchase_events (
  id text PRIMARY KEY NOT NULL,
  subscriber_id text NOT NULL REFERENCES subscribers(id) ON DELETE cascade,
  type text NOT NULL,
  occurred_on text NOT NULL,
  store text NOT NULL,
  amount_cents integer
);
`

export async function ensureDatabaseReady(): Promise<void> {
  await dbClient.executeMultiple(migrationSql)
  await ensureSchemaCompatibility()
  await dbClient.execute("UPDATE apps SET status = 'setup' WHERE status = 'live' AND trim(coalesce(ios_bundle_id, '')) = '' AND trim(coalesce(android_package_name, '')) = ''")
  await ensureConfiguredTenant()
}

async function ensureSchemaCompatibility(): Promise<void> {
  if (await hasColumn('app_store_connect_credentials', 'app_id')) {
    await migrateTenantWideAppStoreConnectTables()
  }
  await ensureColumn('apps', 'apple_app_id', 'text')
  await ensureNullableAppStoreConnectEventTables()
}

async function migrateTenantWideAppStoreConnectTables(): Promise<void> {
  await dbClient.executeMultiple(`
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS __asc_credential_map;
DROP TABLE IF EXISTS __new_apps;
DROP TABLE IF EXISTS __new_app_store_connect_credentials;
DROP TABLE IF EXISTS __new_app_store_connect_capabilities;
DROP TABLE IF EXISTS __new_app_store_connect_sales_reports;
DROP TABLE IF EXISTS __new_app_store_connect_audit_events;
CREATE TABLE __asc_credential_map AS
  SELECT old_credentials.id AS old_id,
    (SELECT selected_credentials.id FROM app_store_connect_credentials selected_credentials WHERE selected_credentials.tenant_id = old_credentials.tenant_id ORDER BY selected_credentials.updated_at DESC, selected_credentials.created_at DESC, selected_credentials.id DESC LIMIT 1) AS new_id
  FROM app_store_connect_credentials old_credentials;
CREATE TABLE __new_apps (id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE cascade, name text NOT NULL, initials text NOT NULL, color text NOT NULL, bundle_id text DEFAULT '' NOT NULL, apple_app_id text, ios_bundle_id text, android_package_name text, status text DEFAULT 'setup' NOT NULL, monthly_revenue_cents integer DEFAULT 0 NOT NULL, active_subscriber_count integer DEFAULT 0 NOT NULL, created_at integer NOT NULL);
INSERT INTO __new_apps SELECT old_apps.id, old_apps.tenant_id, old_apps.name, old_apps.initials, old_apps.color,
  coalesce(nullif(old_apps.bundle_id, ''), (SELECT c.bundle_id FROM app_store_connect_credentials c WHERE c.app_id = old_apps.id ORDER BY c.updated_at DESC, c.created_at DESC, c.id DESC LIMIT 1), ''),
  (SELECT c.apple_app_id FROM app_store_connect_credentials c WHERE c.app_id = old_apps.id ORDER BY c.updated_at DESC, c.created_at DESC, c.id DESC LIMIT 1),
  coalesce(nullif(old_apps.ios_bundle_id, ''), (SELECT c.bundle_id FROM app_store_connect_credentials c WHERE c.app_id = old_apps.id ORDER BY c.updated_at DESC, c.created_at DESC, c.id DESC LIMIT 1), nullif(old_apps.bundle_id, '')),
  old_apps.android_package_name,
  CASE WHEN old_apps.status = 'live' AND trim(coalesce(nullif(old_apps.ios_bundle_id, ''), (SELECT c.bundle_id FROM app_store_connect_credentials c WHERE c.app_id = old_apps.id ORDER BY c.updated_at DESC, c.created_at DESC, c.id DESC LIMIT 1), nullif(old_apps.bundle_id, ''), '')) = '' AND trim(coalesce(old_apps.android_package_name, '')) = '' THEN 'setup' ELSE old_apps.status END,
  old_apps.monthly_revenue_cents, old_apps.active_subscriber_count, old_apps.created_at FROM apps old_apps;
DROP TABLE apps;
ALTER TABLE __new_apps RENAME TO apps;
CREATE TABLE __new_app_store_connect_credentials (id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE cascade, key_id text NOT NULL, issuer_id text NOT NULL, vendor_number text, private_key_ciphertext text, private_key_iv text, private_key_auth_tag text, private_key_sha256 text, status text DEFAULT 'needs_attention' NOT NULL, last_validated_at integer, last_error text, created_at integer NOT NULL, updated_at integer NOT NULL, disabled_at integer);
INSERT INTO __new_app_store_connect_credentials SELECT id, tenant_id, key_id, issuer_id, vendor_number, private_key_ciphertext, private_key_iv, private_key_auth_tag, private_key_sha256, status, last_validated_at, last_error, created_at, updated_at, disabled_at FROM app_store_connect_credentials WHERE id IN (SELECT DISTINCT new_id FROM __asc_credential_map);
DROP TABLE app_store_connect_credentials;
ALTER TABLE __new_app_store_connect_credentials RENAME TO app_store_connect_credentials;
CREATE UNIQUE INDEX IF NOT EXISTS app_store_connect_credentials_tenant_id_unique ON app_store_connect_credentials(tenant_id);
CREATE TABLE __new_app_store_connect_capabilities (id text PRIMARY KEY NOT NULL, credential_id text NOT NULL REFERENCES app_store_connect_credentials(id) ON DELETE cascade, key text NOT NULL, label text NOT NULL, description text NOT NULL, status text NOT NULL, detail text NOT NULL, checked_at integer NOT NULL);
INSERT OR REPLACE INTO __new_app_store_connect_capabilities SELECT credential_map.new_id || ':' || old_capabilities.key, credential_map.new_id, old_capabilities.key, old_capabilities.label, old_capabilities.description, old_capabilities.status, old_capabilities.detail, old_capabilities.checked_at FROM app_store_connect_capabilities old_capabilities INNER JOIN __asc_credential_map credential_map ON credential_map.old_id = old_capabilities.credential_id WHERE credential_map.new_id IS NOT NULL ORDER BY old_capabilities.checked_at;
DROP TABLE app_store_connect_capabilities;
ALTER TABLE __new_app_store_connect_capabilities RENAME TO app_store_connect_capabilities;
CREATE UNIQUE INDEX IF NOT EXISTS app_store_connect_capabilities_credential_key_unique ON app_store_connect_capabilities(credential_id, key);
CREATE TABLE __new_app_store_connect_sales_reports (id text PRIMARY KEY NOT NULL, credential_id text NOT NULL REFERENCES app_store_connect_credentials(id) ON DELETE cascade, app_id text REFERENCES apps(id) ON DELETE cascade, vendor_number text NOT NULL, report_date text NOT NULL, status text NOT NULL, row_count integer DEFAULT 0 NOT NULL, raw_text text, error_detail text, created_at integer NOT NULL);
INSERT INTO __new_app_store_connect_sales_reports SELECT old_reports.id, credential_map.new_id, old_reports.app_id, old_reports.vendor_number, old_reports.report_date, old_reports.status, old_reports.row_count, old_reports.raw_text, old_reports.error_detail, old_reports.created_at FROM app_store_connect_sales_reports old_reports INNER JOIN __asc_credential_map credential_map ON credential_map.old_id = old_reports.credential_id WHERE credential_map.new_id IS NOT NULL;
DROP TABLE app_store_connect_sales_reports;
ALTER TABLE __new_app_store_connect_sales_reports RENAME TO app_store_connect_sales_reports;
CREATE TABLE __new_app_store_connect_audit_events (id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE cascade, app_id text REFERENCES apps(id) ON DELETE cascade, credential_id text REFERENCES app_store_connect_credentials(id) ON DELETE set null, actor_user_id text REFERENCES users(id) ON DELETE set null, action text NOT NULL, detail text NOT NULL, created_at integer NOT NULL);
INSERT INTO __new_app_store_connect_audit_events SELECT old_audits.id, old_audits.tenant_id, old_audits.app_id, credential_map.new_id, old_audits.actor_user_id, old_audits.action, old_audits.detail, old_audits.created_at FROM app_store_connect_audit_events old_audits LEFT JOIN __asc_credential_map credential_map ON credential_map.old_id = old_audits.credential_id;
DROP TABLE app_store_connect_audit_events;
ALTER TABLE __new_app_store_connect_audit_events RENAME TO app_store_connect_audit_events;
DROP TABLE __asc_credential_map;
PRAGMA foreign_keys=ON;
`)
}

async function ensureNullableAppStoreConnectEventTables(): Promise<void> {
  if (await isRequiredColumn('app_store_connect_sales_reports', 'app_id')) await recreateSalesReportsWithNullableApp()
  if (await isRequiredColumn('app_store_connect_audit_events', 'app_id')) await recreateAuditEventsWithNullableApp()
}

async function recreateSalesReportsWithNullableApp(): Promise<void> {
  await dbClient.executeMultiple(`
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS __new_app_store_connect_sales_reports;
CREATE TABLE __new_app_store_connect_sales_reports (id text PRIMARY KEY NOT NULL, credential_id text NOT NULL REFERENCES app_store_connect_credentials(id) ON DELETE cascade, app_id text REFERENCES apps(id) ON DELETE cascade, vendor_number text NOT NULL, report_date text NOT NULL, status text NOT NULL, row_count integer DEFAULT 0 NOT NULL, raw_text text, error_detail text, created_at integer NOT NULL);
INSERT INTO __new_app_store_connect_sales_reports SELECT id, credential_id, app_id, vendor_number, report_date, status, row_count, raw_text, error_detail, created_at FROM app_store_connect_sales_reports;
DROP TABLE app_store_connect_sales_reports;
ALTER TABLE __new_app_store_connect_sales_reports RENAME TO app_store_connect_sales_reports;
PRAGMA foreign_keys=ON;
`)
}

async function recreateAuditEventsWithNullableApp(): Promise<void> {
  await dbClient.executeMultiple(`
PRAGMA foreign_keys=OFF;
DROP TABLE IF EXISTS __new_app_store_connect_audit_events;
CREATE TABLE __new_app_store_connect_audit_events (id text PRIMARY KEY NOT NULL, tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE cascade, app_id text REFERENCES apps(id) ON DELETE cascade, credential_id text REFERENCES app_store_connect_credentials(id) ON DELETE set null, actor_user_id text REFERENCES users(id) ON DELETE set null, action text NOT NULL, detail text NOT NULL, created_at integer NOT NULL);
INSERT INTO __new_app_store_connect_audit_events SELECT id, tenant_id, app_id, credential_id, actor_user_id, action, detail, created_at FROM app_store_connect_audit_events;
DROP TABLE app_store_connect_audit_events;
ALTER TABLE __new_app_store_connect_audit_events RENAME TO app_store_connect_audit_events;
PRAGMA foreign_keys=ON;
`)
}

async function ensureColumn(table: string, column: string, definition: string): Promise<void> {
  if (await hasColumn(table, column)) return
  await dbClient.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

async function hasColumn(table: string, column: string): Promise<boolean> {
  const columns = await tableColumns(table)
  return columns.some((row) => row.name === column)
}

async function isRequiredColumn(table: string, column: string): Promise<boolean> {
  const columns = await tableColumns(table)
  const match = columns.find((row) => row.name === column)
  return match == null ? false : Boolean(match.notnull)
}

async function tableColumns(table: string): Promise<Array<{ name: unknown; notnull: unknown }>> {
  const result = await db.run(sql.raw(`PRAGMA table_info(${table})`))
  return result.rows.map((row) => ({ name: row.name, notnull: row.notnull }))
}

async function ensureConfiguredTenant(): Promise<void> {
  const env = parseServerEnv(process.env)
  const tenantId = env.TENANT_ID
  const tenant = {
    color: env.TENANT_COLOR,
    createdAt: new Date(),
    id: tenantId,
    initials: env.TENANT_INITIALS,
    name: env.TENANT_NAME,
  }

  await db.insert(tenants).values(tenant).onConflictDoNothing()
  await db.update(tenants).set({ color: tenant.color, initials: tenant.initials, name: tenant.name }).where(eq(tenants.id, tenantId))
}

export const prepareSubscriptionConsoleDatabase = createServerFn({ method: 'POST' }).handler(async () => {
  await ensureDatabaseReady()
  return { ok: true }
})

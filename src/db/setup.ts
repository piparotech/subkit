import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'

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
  bundle_id text NOT NULL,
  ios_bundle_id text,
  android_package_name text,
  status text DEFAULT 'live' NOT NULL,
  monthly_revenue_cents integer DEFAULT 0 NOT NULL,
  active_subscriber_count integer DEFAULT 0 NOT NULL,
  created_at integer NOT NULL
);
CREATE TABLE IF NOT EXISTS app_store_connect_credentials (
  id text PRIMARY KEY NOT NULL,
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE cascade,
  app_id text NOT NULL REFERENCES apps(id) ON DELETE cascade,
  key_id text NOT NULL,
  issuer_id text NOT NULL,
  apple_app_id text,
  bundle_id text,
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
CREATE UNIQUE INDEX IF NOT EXISTS app_store_connect_credentials_app_id_unique ON app_store_connect_credentials(app_id);
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
  app_id text NOT NULL REFERENCES apps(id) ON DELETE cascade,
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
  app_id text NOT NULL REFERENCES apps(id) ON DELETE cascade,
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
  await ensureConfiguredTenant()
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

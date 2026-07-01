CREATE TABLE `app_platforms` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`platform` text NOT NULL,
	`store` text NOT NULL,
	`bundle_id` text,
	`package_name` text,
	`store_app_id` text,
	`environment` text DEFAULT 'unknown' NOT NULL,
	`status` text DEFAULT 'needs_setup' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_platforms_app_store_environment_unique` ON `app_platforms` (`app_id`,`store`,`environment`);--> statement-breakpoint
CREATE TABLE `app_store_connect_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`app_id` text,
	`credential_id` text,
	`actor_user_id` text,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`credential_id`) REFERENCES `app_store_connect_credentials`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `app_store_connect_capabilities` (
	`id` text PRIMARY KEY NOT NULL,
	`credential_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`detail` text NOT NULL,
	`checked_at` integer NOT NULL,
	FOREIGN KEY (`credential_id`) REFERENCES `app_store_connect_credentials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_store_connect_capabilities_credential_key_unique` ON `app_store_connect_capabilities` (`credential_id`,`key`);--> statement-breakpoint
CREATE TABLE `app_store_connect_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`key_id` text NOT NULL,
	`issuer_id` text NOT NULL,
	`vendor_number` text,
	`private_key_ciphertext` text,
	`private_key_iv` text,
	`private_key_auth_tag` text,
	`private_key_sha256` text,
	`status` text DEFAULT 'needs_attention' NOT NULL,
	`last_validated_at` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`disabled_at` integer,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_store_connect_credentials_tenant_id_unique` ON `app_store_connect_credentials` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `app_store_connect_sales_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`credential_id` text NOT NULL,
	`app_id` text,
	`vendor_number` text NOT NULL,
	`report_date` text NOT NULL,
	`status` text NOT NULL,
	`row_count` integer DEFAULT 0 NOT NULL,
	`raw_text` text,
	`error_detail` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`credential_id`) REFERENCES `app_store_connect_credentials`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `app_user_aliases` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_user_id` text NOT NULL,
	`alias` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_user_aliases_app_alias_unique` ON `app_user_aliases` (`app_id`,`alias`);--> statement-breakpoint
CREATE TABLE `app_user_store_identities` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_user_id` text NOT NULL,
	`store` text NOT NULL,
	`app_account_token` text,
	`obfuscated_account_id` text,
	`obfuscated_profile_id` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_user_store_identities_user_store_unique` ON `app_user_store_identities` (`app_id`,`app_user_id`,`store`);--> statement-breakpoint
CREATE UNIQUE INDEX `app_user_store_identities_apple_token_unique` ON `app_user_store_identities` (`app_id`,`app_account_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `app_user_store_identities_google_account_unique` ON `app_user_store_identities` (`app_id`,`obfuscated_account_id`);--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_user_id` text NOT NULL,
	`country_code` text DEFAULT 'XX' NOT NULL,
	`country` text DEFAULT 'Unknown' NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_app_user_id_unique` ON `app_users` (`app_id`,`app_user_id`);--> statement-breakpoint
CREATE TABLE `apps` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`initials` text NOT NULL,
	`color` text NOT NULL,
	`bundle_id` text DEFAULT '' NOT NULL,
	`apple_app_id` text,
	`ios_bundle_id` text,
	`android_package_name` text,
	`status` text DEFAULT 'setup' NOT NULL,
	`monthly_revenue_cents` integer DEFAULT 0 NOT NULL,
	`active_app_user_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `auth_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`type` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`user_agent` text,
	`ip_hash` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_hash_unique` ON `auth_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `entitlement_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_user_id` text NOT NULL,
	`entitlement_id` text NOT NULL,
	`product_id` text,
	`product_plan_id` text,
	`store_product_binding_id` text,
	`store_purchase_id` text,
	`ownership_source` text DEFAULT 'direct_app_user' NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`starts_at` text NOT NULL,
	`expires_at` text,
	`revoked_at` integer,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entitlement_id`) REFERENCES `entitlements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`product_plan_id`) REFERENCES `product_plans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`store_product_binding_id`) REFERENCES `store_product_bindings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`key` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entitlements_app_key_unique` ON `entitlements` (`app_id`,`key`);--> statement-breakpoint
CREATE TABLE `offering_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`offering_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`product_plan_id` text NOT NULL,
	`badge` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_plan_id`) REFERENCES `product_plans`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `offering_packages_offering_key_unique` ON `offering_packages` (`offering_id`,`key`);--> statement-breakpoint
CREATE TABLE `offerings` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`tag` text NOT NULL,
	`tag_tone` text DEFAULT 'muted' NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`id` text PRIMARY KEY NOT NULL,
	`product_plan_id` text NOT NULL,
	`currency_code` text NOT NULL,
	`country_code` text,
	`amount_micros` integer NOT NULL,
	`tax_inclusive` integer,
	`starts_at` integer,
	`ends_at` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_plan_id`) REFERENCES `product_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prices_plan_currency_country_unique` ON `prices` (`product_plan_id`,`currency_code`,`country_code`);--> statement-breakpoint
CREATE TABLE `product_entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`entitlement_id` text NOT NULL,
	`grant_mode` text DEFAULT 'while_active' NOT NULL,
	`duration_iso` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entitlement_id`) REFERENCES `entitlements`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_entitlements_product_entitlement_unique` ON `product_entitlements` (`product_id`,`entitlement_id`);--> statement-breakpoint
CREATE TABLE `product_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`product_plan_id` text NOT NULL,
	`key` text NOT NULL,
	`offer_type` text NOT NULL,
	`eligibility` text DEFAULT 'new_customers' NOT NULL,
	`duration_iso` text,
	`billing_period_count` integer,
	`price_amount_micros` integer,
	`price_currency_code` text,
	`status` text DEFAULT 'active' NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_plan_id`) REFERENCES `product_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_offers_plan_key_unique` ON `product_offers` (`product_plan_id`,`key`);--> statement-breakpoint
CREATE TABLE `product_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`key` text NOT NULL,
	`billing_kind` text NOT NULL,
	`billing_period_iso` text,
	`grace_period_iso` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_plans_product_key_unique` ON `product_plans` (`product_id`,`key`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`product_type` text DEFAULT 'subscription' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`active_app_user_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_app_key_unique` ON `products` (`app_id`,`key`);--> statement-breakpoint
CREATE TABLE `purchase_events` (
	`id` text PRIMARY KEY NOT NULL,
	`app_user_id` text NOT NULL,
	`entitlement_grant_id` text,
	`type` text NOT NULL,
	`occurred_on` text NOT NULL,
	`store` text NOT NULL,
	`amount_cents` integer,
	FOREIGN KEY (`app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entitlement_grant_id`) REFERENCES `entitlement_grants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `runtime_reconcile_events` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_user_id` text,
	`store_purchase_ownership_id` text,
	`store` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`store_purchase_ownership_id`) REFERENCES `store_purchase_ownerships`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `store_catalog_drift_items` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`store_product_binding_id` text,
	`snapshot_id` text,
	`severity` text NOT NULL,
	`field_path` text NOT NULL,
	`expected_json` text,
	`actual_json` text,
	`drift_type` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`detected_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_product_binding_id`) REFERENCES `store_product_bindings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`snapshot_id`) REFERENCES `store_catalog_snapshots`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `store_catalog_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`app_platform_id` text,
	`store` text NOT NULL,
	`sync_run_id` text,
	`external_id` text NOT NULL,
	`external_parent_id` text,
	`object_type` text NOT NULL,
	`environment` text DEFAULT 'production' NOT NULL,
	`raw_json` text NOT NULL,
	`normalized_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`fetched_at` integer NOT NULL,
	FOREIGN KEY (`app_platform_id`) REFERENCES `app_platforms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `store_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_platform_id` text,
	`store` text NOT NULL,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'needs_auth' NOT NULL,
	`external_app_id` text,
	`config_json` text,
	`capabilities_json` text,
	`last_permission_check_at` integer,
	`last_sync_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_platform_id`) REFERENCES `app_platforms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_integrations_app_store_unique` ON `store_integrations` (`app_id`,`store`);--> statement-breakpoint
CREATE TABLE `store_mutation_plan_items` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`store_product_binding_id` text,
	`operation` text NOT NULL,
	`object_type` text NOT NULL,
	`external_id` text,
	`before_json` text,
	`after_json` text NOT NULL,
	`diff_json` text NOT NULL,
	`risk` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`error_detail` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `store_mutation_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_product_binding_id`) REFERENCES `store_product_bindings`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `store_mutation_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_platform_id` text,
	`store` text NOT NULL,
	`status` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`confirmed_by_user_id` text,
	`created_at` integer NOT NULL,
	`confirmed_at` integer,
	`applied_at` integer,
	`base_remote_snapshot_hash` text NOT NULL,
	`local_revision` text NOT NULL,
	`preview_hash` text NOT NULL,
	`summary_json` text NOT NULL,
	`risk` text DEFAULT 'none' NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_platform_id`) REFERENCES `app_platforms`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`confirmed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `store_product_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_platform_id` text,
	`product_id` text NOT NULL,
	`product_plan_id` text NOT NULL,
	`store_integration_id` text,
	`store` text NOT NULL,
	`external_product_id` text NOT NULL,
	`external_base_plan_id` text DEFAULT '' NOT NULL,
	`external_subscription_group_id` text,
	`external_package_name` text,
	`environment` text DEFAULT 'production' NOT NULL,
	`binding_status` text DEFAULT 'linked' NOT NULL,
	`sync_direction` text DEFAULT 'subkit_to_store' NOT NULL,
	`last_snapshot_id` text,
	`last_compared_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_platform_id`) REFERENCES `app_platforms`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_plan_id`) REFERENCES `product_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`store_integration_id`) REFERENCES `store_integrations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_product_bindings_store_product_unique` ON `store_product_bindings` (`app_id`,`store`,`external_product_id`,`external_base_plan_id`,`environment`);--> statement-breakpoint
CREATE TABLE `store_purchase_ownerships` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_user_id` text NOT NULL,
	`product_id` text,
	`product_plan_id` text,
	`store_product_binding_id` text,
	`entitlement_grant_id` text,
	`store` text NOT NULL,
	`product_identifier` text NOT NULL,
	`transaction_id` text NOT NULL,
	`original_transaction_id` text NOT NULL,
	`environment` text DEFAULT 'unknown' NOT NULL,
	`ownership_type` text DEFAULT 'unknown' NOT NULL,
	`purchase_token_hash` text,
	`receipt_hash` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`purchased_at` text NOT NULL,
	`expires_at` text,
	`revoked_at` integer,
	`raw_payload_json` text,
	`last_reconciled_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`product_plan_id`) REFERENCES `product_plans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`store_product_binding_id`) REFERENCES `store_product_bindings`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`entitlement_grant_id`) REFERENCES `entitlement_grants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_purchase_ownerships_store_original_unique` ON `store_purchase_ownerships` (`app_id`,`store`,`original_transaction_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `store_purchase_ownerships_store_transaction_unique` ON `store_purchase_ownerships` (`app_id`,`store`,`transaction_id`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_platform_id` text,
	`store` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`started_by_user_id` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`summary_json` text,
	`error_detail` text,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_platform_id`) REFERENCES `app_platforms`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`started_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`initials` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_tenants` (
	`user_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`role` text NOT NULL,
	`invited_by_user_id` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `tenant_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`name` text NOT NULL,
	`organization` text NOT NULL,
	`initials` text NOT NULL,
	`operator` integer DEFAULT false NOT NULL,
	`global_role` text DEFAULT 'user' NOT NULL,
	`zitadel_subject` text,
	`zitadel_login_name` text,
	`identity_provider` text,
	`last_login_at` integer,
	`disabled_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_zitadel_subject_unique` ON `users` (`zitadel_subject`);
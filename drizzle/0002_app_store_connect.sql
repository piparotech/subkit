CREATE TABLE `app_store_connect_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`app_id` text NOT NULL,
	`key_id` text NOT NULL,
	`issuer_id` text NOT NULL,
	`apple_app_id` text,
	`bundle_id` text,
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
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_store_connect_credentials_app_id_unique` ON `app_store_connect_credentials` (`app_id`);--> statement-breakpoint
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
CREATE TABLE `app_store_connect_sales_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`credential_id` text NOT NULL,
	`app_id` text NOT NULL,
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
CREATE TABLE `app_store_connect_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`app_id` text NOT NULL,
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

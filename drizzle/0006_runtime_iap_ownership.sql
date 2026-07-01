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
ALTER TABLE `entitlement_grants` ADD `store_purchase_id` text;--> statement-breakpoint
ALTER TABLE `entitlement_grants` ADD `ownership_source` text DEFAULT 'direct_app_user' NOT NULL;--> statement-breakpoint
CREATE TABLE `store_purchase_ownerships` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_user_id` text NOT NULL,
	`product_id` text,
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
	FOREIGN KEY (`entitlement_grant_id`) REFERENCES `entitlement_grants`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `store_purchase_ownerships_store_original_unique` ON `store_purchase_ownerships` (`app_id`,`store`,`original_transaction_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `store_purchase_ownerships_store_transaction_unique` ON `store_purchase_ownerships` (`app_id`,`store`,`transaction_id`);--> statement-breakpoint
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

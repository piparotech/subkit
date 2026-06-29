CREATE TABLE `apps` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`name` text NOT NULL,
	`initials` text NOT NULL,
	`color` text NOT NULL,
	`bundle_id` text NOT NULL,
	`ios_bundle_id` text,
	`android_package_name` text,
	`status` text DEFAULT 'live' NOT NULL,
	`monthly_revenue_cents` integer DEFAULT 0 NOT NULL,
	`active_subscriber_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `entitlements` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`key` text NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `offering_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`offering_id` text NOT NULL,
	`label` text NOT NULL,
	`product_id` text NOT NULL,
	`price_label` text NOT NULL,
	`badge` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`offering_id`) REFERENCES `offerings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`display_name` text NOT NULL,
	`identifier` text NOT NULL,
	`app_store_id` text NOT NULL,
	`play_store_id` text NOT NULL,
	`duration` text NOT NULL,
	`price_cents` integer NOT NULL,
	`active_subscriber_count` integer DEFAULT 0 NOT NULL,
	`entitlement_id` text NOT NULL,
	`trial_enabled` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entitlement_id`) REFERENCES `entitlements`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `purchase_events` (
	`id` text PRIMARY KEY NOT NULL,
	`subscriber_id` text NOT NULL,
	`type` text NOT NULL,
	`occurred_on` text NOT NULL,
	`store` text NOT NULL,
	`amount_cents` integer,
	FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `subscribers` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`app_user_id` text NOT NULL,
	`country_code` text NOT NULL,
	`country` text NOT NULL,
	`plan` text NOT NULL,
	`status` text NOT NULL,
	`subscriber_since` text NOT NULL,
	`lifetime_value_cents` integer DEFAULT 0 NOT NULL,
	`entitlement_id` text,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entitlement_id`) REFERENCES `entitlements`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`initials` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL
);

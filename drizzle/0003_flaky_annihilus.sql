PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__asc_credential_map` AS
SELECT
	old_credentials.`id` AS `old_id`,
	(
		SELECT selected_credentials.`id`
		FROM `app_store_connect_credentials` selected_credentials
		WHERE selected_credentials.`tenant_id` = old_credentials.`tenant_id`
		ORDER BY selected_credentials.`updated_at` DESC, selected_credentials.`created_at` DESC, selected_credentials.`id` DESC
		LIMIT 1
	) AS `new_id`
FROM `app_store_connect_credentials` old_credentials;
--> statement-breakpoint
CREATE TABLE `__new_apps` (
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
	`active_subscriber_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_apps`(
	"id",
	"tenant_id",
	"name",
	"initials",
	"color",
	"bundle_id",
	"apple_app_id",
	"ios_bundle_id",
	"android_package_name",
	"status",
	"monthly_revenue_cents",
	"active_subscriber_count",
	"created_at"
)
SELECT
	old_apps."id",
	old_apps."tenant_id",
	old_apps."name",
	old_apps."initials",
	old_apps."color",
	coalesce(
		nullif(old_apps."bundle_id", ''),
		(
			SELECT old_credentials."bundle_id"
			FROM `app_store_connect_credentials` old_credentials
			WHERE old_credentials."app_id" = old_apps."id"
			ORDER BY old_credentials."updated_at" DESC, old_credentials."created_at" DESC, old_credentials."id" DESC
			LIMIT 1
		),
		''
	),
	(
		SELECT old_credentials."apple_app_id"
		FROM `app_store_connect_credentials` old_credentials
		WHERE old_credentials."app_id" = old_apps."id"
		ORDER BY old_credentials."updated_at" DESC, old_credentials."created_at" DESC, old_credentials."id" DESC
		LIMIT 1
	),
	coalesce(
		nullif(old_apps."ios_bundle_id", ''),
		(
			SELECT old_credentials."bundle_id"
			FROM `app_store_connect_credentials` old_credentials
			WHERE old_credentials."app_id" = old_apps."id"
			ORDER BY old_credentials."updated_at" DESC, old_credentials."created_at" DESC, old_credentials."id" DESC
			LIMIT 1
		),
		nullif(old_apps."bundle_id", '')
	),
	old_apps."android_package_name",
	CASE
		WHEN old_apps."status" = 'live'
			AND trim(coalesce(
				nullif(old_apps."ios_bundle_id", ''),
				(
					SELECT old_credentials."bundle_id"
					FROM `app_store_connect_credentials` old_credentials
					WHERE old_credentials."app_id" = old_apps."id"
					ORDER BY old_credentials."updated_at" DESC, old_credentials."created_at" DESC, old_credentials."id" DESC
					LIMIT 1
				),
				nullif(old_apps."bundle_id", ''),
				''
			)) = ''
			AND trim(coalesce(old_apps."android_package_name", '')) = ''
		THEN 'setup'
		ELSE old_apps."status"
	END,
	old_apps."monthly_revenue_cents",
	old_apps."active_subscriber_count",
	old_apps."created_at"
FROM `apps` old_apps;
--> statement-breakpoint
DROP TABLE `apps`;--> statement-breakpoint
ALTER TABLE `__new_apps` RENAME TO `apps`;--> statement-breakpoint
CREATE TABLE `__new_app_store_connect_credentials` (
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
INSERT INTO `__new_app_store_connect_credentials`(
	"id",
	"tenant_id",
	"key_id",
	"issuer_id",
	"vendor_number",
	"private_key_ciphertext",
	"private_key_iv",
	"private_key_auth_tag",
	"private_key_sha256",
	"status",
	"last_validated_at",
	"last_error",
	"created_at",
	"updated_at",
	"disabled_at"
)
SELECT
	old_credentials."id",
	old_credentials."tenant_id",
	old_credentials."key_id",
	old_credentials."issuer_id",
	old_credentials."vendor_number",
	old_credentials."private_key_ciphertext",
	old_credentials."private_key_iv",
	old_credentials."private_key_auth_tag",
	old_credentials."private_key_sha256",
	old_credentials."status",
	old_credentials."last_validated_at",
	old_credentials."last_error",
	old_credentials."created_at",
	old_credentials."updated_at",
	old_credentials."disabled_at"
FROM `app_store_connect_credentials` old_credentials
WHERE old_credentials."id" IN (SELECT DISTINCT "new_id" FROM `__asc_credential_map`);
--> statement-breakpoint
DROP TABLE `app_store_connect_credentials`;--> statement-breakpoint
ALTER TABLE `__new_app_store_connect_credentials` RENAME TO `app_store_connect_credentials`;--> statement-breakpoint
CREATE UNIQUE INDEX `app_store_connect_credentials_tenant_id_unique` ON `app_store_connect_credentials` (`tenant_id`);--> statement-breakpoint
CREATE TABLE `__new_app_store_connect_capabilities` (
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
INSERT OR REPLACE INTO `__new_app_store_connect_capabilities`(
	"id",
	"credential_id",
	"key",
	"label",
	"description",
	"status",
	"detail",
	"checked_at"
)
SELECT
	credential_map."new_id" || ':' || old_capabilities."key",
	credential_map."new_id",
	old_capabilities."key",
	old_capabilities."label",
	old_capabilities."description",
	old_capabilities."status",
	old_capabilities."detail",
	old_capabilities."checked_at"
FROM `app_store_connect_capabilities` old_capabilities
INNER JOIN `__asc_credential_map` credential_map ON credential_map."old_id" = old_capabilities."credential_id"
WHERE credential_map."new_id" IS NOT NULL
ORDER BY old_capabilities."checked_at";
--> statement-breakpoint
DROP TABLE `app_store_connect_capabilities`;--> statement-breakpoint
ALTER TABLE `__new_app_store_connect_capabilities` RENAME TO `app_store_connect_capabilities`;--> statement-breakpoint
CREATE UNIQUE INDEX `app_store_connect_capabilities_credential_key_unique` ON `app_store_connect_capabilities` (`credential_id`,`key`);--> statement-breakpoint
CREATE TABLE `__new_app_store_connect_sales_reports` (
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
INSERT INTO `__new_app_store_connect_sales_reports`(
	"id",
	"credential_id",
	"app_id",
	"vendor_number",
	"report_date",
	"status",
	"row_count",
	"raw_text",
	"error_detail",
	"created_at"
)
SELECT
	old_reports."id",
	credential_map."new_id",
	old_reports."app_id",
	old_reports."vendor_number",
	old_reports."report_date",
	old_reports."status",
	old_reports."row_count",
	old_reports."raw_text",
	old_reports."error_detail",
	old_reports."created_at"
FROM `app_store_connect_sales_reports` old_reports
INNER JOIN `__asc_credential_map` credential_map ON credential_map."old_id" = old_reports."credential_id"
WHERE credential_map."new_id" IS NOT NULL;
--> statement-breakpoint
DROP TABLE `app_store_connect_sales_reports`;--> statement-breakpoint
ALTER TABLE `__new_app_store_connect_sales_reports` RENAME TO `app_store_connect_sales_reports`;--> statement-breakpoint
CREATE TABLE `__new_app_store_connect_audit_events` (
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
INSERT INTO `__new_app_store_connect_audit_events`(
	"id",
	"tenant_id",
	"app_id",
	"credential_id",
	"actor_user_id",
	"action",
	"detail",
	"created_at"
)
SELECT
	old_audits."id",
	old_audits."tenant_id",
	old_audits."app_id",
	credential_map."new_id",
	old_audits."actor_user_id",
	old_audits."action",
	old_audits."detail",
	old_audits."created_at"
FROM `app_store_connect_audit_events` old_audits
LEFT JOIN `__asc_credential_map` credential_map ON credential_map."old_id" = old_audits."credential_id";
--> statement-breakpoint
DROP TABLE `app_store_connect_audit_events`;--> statement-breakpoint
ALTER TABLE `__new_app_store_connect_audit_events` RENAME TO `app_store_connect_audit_events`;--> statement-breakpoint
DROP TABLE `__asc_credential_map`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
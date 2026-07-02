CREATE INDEX `auth_sessions_user_expires_idx` ON `auth_sessions` (`user_id`,`expires_at`);
--> statement-breakpoint
CREATE INDEX `app_store_connect_sales_reports_credential_created_idx` ON `app_store_connect_sales_reports` (`credential_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `app_store_connect_audit_events_credential_created_idx` ON `app_store_connect_audit_events` (`credential_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `app_store_connect_audit_events_tenant_created_idx` ON `app_store_connect_audit_events` (`tenant_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `entitlement_grants_app_user_idx` ON `entitlement_grants` (`app_id`,`app_user_id`);
--> statement-breakpoint
CREATE INDEX `store_purchase_ownerships_app_user_idx` ON `store_purchase_ownerships` (`app_id`,`app_user_id`);

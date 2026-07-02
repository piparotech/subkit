ALTER TABLE `apps` ADD `runtime_sdk_key_hash` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `apps_runtime_sdk_key_hash_unique` ON `apps` (`runtime_sdk_key_hash`);

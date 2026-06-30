ALTER TABLE `users` ADD `global_role` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
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

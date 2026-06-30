INSERT INTO `tenants` (`id`, `name`, `initials`, `color`, `created_at`)
VALUES ('piparo', 'piparo.tech', 'PI', 'oklch(0.62 0.17 152)', 1782775588302)
ON CONFLICT(`id`) DO UPDATE SET
  `name` = excluded.`name`,
  `initials` = excluded.`initials`,
  `color` = excluded.`color`;
--> statement-breakpoint
INSERT INTO `user_tenants` (`user_id`, `tenant_id`, `role`, `invited_by_user_id`, `created_at`)
SELECT `id`, 'piparo', 'admin', NULL, 1782846625683
FROM `users`
WHERE `operator` = 1 OR `email` LIKE '%@piparo.tech'
ON CONFLICT(`user_id`, `tenant_id`) DO NOTHING;

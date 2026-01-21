CREATE TABLE `users_new` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL CHECK (`role` IN ('none', 'student', 'teacher', 'admin')),
	`teacher_id` text,
	`name` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL
);

INSERT INTO `users_new` (`id`, `role`, `teacher_id`, `name`, `email`, `created_at`)
SELECT `id`, `role`, `teacher_id`, `name`, `email`, `created_at` FROM `users`;

DROP TABLE `users`;

ALTER TABLE `users_new` RENAME TO `users`;

CREATE UNIQUE INDEX `users_email` ON `users` (`email`);
CREATE INDEX `users_role` ON `users` (`role`);
CREATE INDEX `users_teacher_id` ON `users` (`teacher_id`);

CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`teacher_id` text,
	`name` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `users_email` ON `users` (`email`);
CREATE INDEX `users_role` ON `users` (`role`);
CREATE INDEX `users_teacher_id` ON `users` (`teacher_id`);

INSERT INTO `users` (`id`, `role`, `teacher_id`, `name`, `email`, `created_at`)
SELECT `id`, 'teacher', NULL, `name`, `email`, `created_at` FROM `teachers`;

INSERT INTO `users` (`id`, `role`, `teacher_id`, `name`, `email`, `created_at`)
SELECT `id`, 'student', `teacher_id`, `name`, `email`, `created_at` FROM `students`;

DROP TABLE `teachers`;
DROP TABLE `students`;

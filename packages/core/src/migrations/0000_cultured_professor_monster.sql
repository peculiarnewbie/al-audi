CREATE TABLE `quizzes` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`r2_key` text NOT NULL
);

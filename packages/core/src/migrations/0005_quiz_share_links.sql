CREATE TABLE `quiz_share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`access_token` text,
	`created_at` integer NOT NULL
);

CREATE INDEX `quiz_share_links_quiz_id` ON `quiz_share_links` (`quiz_id`);
CREATE INDEX `quiz_share_links_creator_id` ON `quiz_share_links` (`creator_id`);

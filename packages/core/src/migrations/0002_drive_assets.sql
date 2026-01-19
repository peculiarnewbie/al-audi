CREATE TABLE `drive_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`folder_id` text,
	`file_name` text NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`created_at` integer NOT NULL
);

CREATE INDEX `drive_assets_teacher_id` ON `drive_assets` (`teacher_id`);
CREATE INDEX `drive_assets_folder_id` ON `drive_assets` (`folder_id`);

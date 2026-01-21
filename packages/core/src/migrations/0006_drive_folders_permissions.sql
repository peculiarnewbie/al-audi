CREATE TABLE `drive_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE INDEX `drive_folders_teacher_id` ON `drive_folders` (`teacher_id`);
CREATE INDEX `drive_folders_parent_id` ON `drive_folders` (`parent_id`);

CREATE TABLE `drive_folder_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`folder_id` text NOT NULL,
	`class_id` text,
	`student_id` text,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `drive_folder_permissions_folder_class` ON `drive_folder_permissions` (`folder_id`, `class_id`);
CREATE UNIQUE INDEX `drive_folder_permissions_folder_student` ON `drive_folder_permissions` (`folder_id`, `student_id`);
CREATE INDEX `drive_folder_permissions_folder_id` ON `drive_folder_permissions` (`folder_id`);
CREATE INDEX `drive_folder_permissions_class_id` ON `drive_folder_permissions` (`class_id`);
CREATE INDEX `drive_folder_permissions_student_id` ON `drive_folder_permissions` (`student_id`);

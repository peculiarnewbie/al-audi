CREATE TABLE `quizzes` (
	`id` text PRIMARY KEY NOT NULL,
	`creator_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`r2_key` text NOT NULL
);

CREATE TABLE `quiz_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`category_type` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `quiz_categories_slug_type` ON `quiz_categories` (`slug`, `category_type`);

CREATE TABLE `quiz_category_links` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`category_id` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `quiz_category_links_quiz_category` ON `quiz_category_links` (`quiz_id`, `category_id`);
CREATE INDEX `quiz_category_links_quiz_id` ON `quiz_category_links` (`quiz_id`);

CREATE TABLE `quiz_question_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`question_id` text NOT NULL,
	`asset_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE INDEX `quiz_question_assets_quiz_id` ON `quiz_question_assets` (`quiz_id`);
CREATE INDEX `quiz_question_assets_question_id` ON `quiz_question_assets` (`question_id`);

CREATE TABLE `quiz_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`student_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`mode` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`duration_ms` integer,
	`score` integer,
	`max_score` integer,
	`created_at` integer NOT NULL
);

CREATE INDEX `quiz_attempts_quiz_id` ON `quiz_attempts` (`quiz_id`);
CREATE INDEX `quiz_attempts_student_id` ON `quiz_attempts` (`student_id`);

CREATE TABLE `quiz_responses` (
	`id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`question_id` text NOT NULL,
	`question_type` text NOT NULL,
	`answer_text` text,
	`selected_option` integer,
	`is_correct` integer,
	`created_at` integer NOT NULL
);

CREATE INDEX `quiz_responses_attempt_id` ON `quiz_responses` (`attempt_id`);
CREATE INDEX `quiz_responses_question_id` ON `quiz_responses` (`question_id`);

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

CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);

CREATE INDEX `classes_teacher_id` ON `classes` (`teacher_id`);

CREATE TABLE `class_students` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `class_students_class_student` ON `class_students` (`class_id`, `student_id`);
CREATE INDEX `class_students_class_id` ON `class_students` (`class_id`);
CREATE INDEX `class_students_student_id` ON `class_students` (`student_id`);

CREATE TABLE `quiz_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`question_type` text NOT NULL,
	`prompt` text NOT NULL,
	`answer_text` text,
	`correct_option` integer,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL
);

CREATE INDEX `quiz_questions_quiz_id` ON `quiz_questions` (`quiz_id`);

CREATE TABLE `quiz_question_options` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`option_text` text NOT NULL,
	`option_index` integer NOT NULL,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `quiz_question_options_question_index` ON `quiz_question_options` (`question_id`, `option_index`);
CREATE INDEX `quiz_question_options_question_id` ON `quiz_question_options` (`question_id`);

CREATE TABLE `quiz_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`teacher_id` text NOT NULL,
	`class_id` text,
	`student_id` text,
	`status` text NOT NULL,
	`due_at` integer,
	`created_at` integer NOT NULL
);

CREATE INDEX `quiz_assignments_quiz_id` ON `quiz_assignments` (`quiz_id`);
CREATE INDEX `quiz_assignments_teacher_id` ON `quiz_assignments` (`teacher_id`);
CREATE INDEX `quiz_assignments_class_id` ON `quiz_assignments` (`class_id`);
CREATE INDEX `quiz_assignments_student_id` ON `quiz_assignments` (`student_id`);

CREATE TABLE `live_quiz_results` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`room_id` text NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text NOT NULL,
	`score` integer NOT NULL,
	`max_score` integer NOT NULL,
	`answers_json` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer NOT NULL,
	`created_at` integer NOT NULL
);

CREATE INDEX `live_quiz_results_session_id` ON `live_quiz_results` (`session_id`);
CREATE INDEX `live_quiz_results_room_id` ON `live_quiz_results` (`room_id`);
CREATE INDEX `live_quiz_results_player_id` ON `live_quiz_results` (`player_id`);

CREATE TABLE `quiz_share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`access_token` text,
	`created_at` integer NOT NULL
);

CREATE INDEX `quiz_share_links_quiz_id` ON `quiz_share_links` (`quiz_id`);
CREATE INDEX `quiz_share_links_creator_id` ON `quiz_share_links` (`creator_id`);

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

CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL CHECK (`role` IN ('none', 'student', 'teacher', 'admin')),
	`teacher_id` text,
	`name` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `users_email` ON `users` (`email`);
CREATE INDEX `users_role` ON `users` (`role`);
CREATE INDEX `users_teacher_id` ON `users` (`teacher_id`);

CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL DEFAULT 0,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `user_email` ON `user` (`email`);

CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `session_token` ON `session` (`token`);
CREATE INDEX `session_user_id` ON `session` (`user_id`);
CREATE INDEX `session_expires_at` ON `session` (`expires_at`);

CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE UNIQUE INDEX `account_provider_account` ON `account` (`provider_id`, `account_id`);
CREATE INDEX `account_user_id` ON `account` (`user_id`);

CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX `verification_identifier_value` ON `verification` (`identifier`, `value`);
CREATE INDEX `verification_expires_at` ON `verification` (`expires_at`);

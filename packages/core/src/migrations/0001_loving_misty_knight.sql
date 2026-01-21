CREATE TABLE `class_students` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` text NOT NULL,
	`student_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `drive_folder_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`folder_id` text NOT NULL,
	`class_id` text,
	`student_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `drive_folders` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `quiz_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`category_type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiz_category_links` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`category_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiz_question_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`question_id` text NOT NULL,
	`asset_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quiz_question_options` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`option_text` text NOT NULL,
	`option_index` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `quiz_share_links` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_id` text NOT NULL,
	`creator_id` text NOT NULL,
	`access_token` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL
);

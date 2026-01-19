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

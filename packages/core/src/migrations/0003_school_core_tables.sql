CREATE TABLE `teachers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL
);

CREATE UNIQUE INDEX `teachers_email` ON `teachers` (`email`);

CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`teacher_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL
);

CREATE INDEX `students_teacher_id` ON `students` (`teacher_id`);

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

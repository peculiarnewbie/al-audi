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

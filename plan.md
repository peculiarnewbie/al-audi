# English Learning Add-on App Plan

## Goals

- Ship a usable homework + live quiz companion for the in-person English school.
- Keep teacher-managed workflows (teachers create quizzes/assignments).
- Support async homework plus real-time live quizzes.

## Setup Checklist

- Run `--update-skill` if the Cloudflare skill needs refresh.

## Cloudflare Products

- **Workers**: API routes, share links, QR generation.
- **D1**: quiz metadata, categories, assignments, attempts, results.
- **R2**: question images + internal drive media.
- **Durable Objects**: live quiz sessions, presence, timers, scoring.

## Task Type

- Feature implementation / MVP expansion.

## Milestones

1. **Foundations & storage**
    - Create D1 schema: teachers, students, classes, quizzes, categories, questions, options, assignments, attempts, responses.
    - Done: added teachers, students, classes, class rosters, quiz questions/options, and assignments tables (migration `0003_school_core_tables.sql`).
    - Done: added quiz categories, question assets, attempts, and responses tables (migration `0001_quiz_results_and_categories.sql`).
    - Done: added `/api/quizzes/media` image upload endpoint using `BUCKET` with `quiz-media/` prefix and `quiz_question_assets` metadata.
    - configure R2 bindings for quiz + drive media (code uses `BUCKET` with `quiz-media/` and `drive-media/` prefixes).
    - Done: added `/api/drive/media` upload endpoint + `drive_assets` metadata table for drive uploads.

2. **Quiz authoring upgrades**
    - Done: attach image per question uploads to R2 and stores metadata in D1.
    - Done: category taxonomy (level, topic, skill) stored in `quiz_categories` + `quiz_category_links`.
    - Done: store questions/options in D1 (previously only JSON drafts in R2).

3. **Assignments & results**
    - Done: assignment workflows for quizzes to classes/students (server actions for create/list/update assignments).
    - Done: capture answers, scoring, and timing via attempt submission + scoring (persists `quiz_attempts`/`quiz_responses`).
    - Done: teacher reporting dashboard (class + student views).

4. **Live quiz sessions**
    - Done: basic `GameRoom` Durable Object + `/api/room/$roomId` WebSocket route (join/leave/start/answer).
    - Done: live question broadcast + realtime scoring for sample sessions.
    - Done: persist final session results to D1 (`live_quiz_results`).

5. **Sharing & QR**
    - Done: shareable quiz links with optional access token.
    - Done: generate QR image in Worker and cache in R2.

6. **Internal drive**
    - Done: teacher uploads PDFs/audio/images via `/api/drive/media` + `drive_assets`.
    - Done: folder/category structure stored in D1.
    - Done: permissions by class/student.

7. **Admin access control**
    - Add superadmin dashboard to assign teacher accounts.
    - Done: migrate `teachers`/`students` tables into a general `users` table (migration `0007_users_table.sql`).
    - Done: enforce `users.role` enum values (none, student, teacher, admin) (migration `0008_users_role_enum.sql`).
    - Done: create a `users` row on every sign-up/login.

## Deliverables

- API routes for quiz CRUD, media upload, assignments, and results.
- Teacher UI: authoring, assignments, results, internal drive.
- Student UI: quiz runner (async) + live session join.
- QR share page for quick access.

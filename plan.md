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
    - Done: added quiz categories, question assets, attempts, and responses tables (migration `0001_quiz_results_and_categories.sql`).
    - Done: added `/api/quizzes/media` image upload endpoint using `BUCKET` with `quiz-media/` prefix and `quiz_question_assets` metadata.
    - Create R2 buckets: `quiz-media` (question images), `drive-media` (homework PDFs/audio).
    - Done: added `/api/drive/media` upload endpoint + `drive_assets` metadata table for drive uploads.

2. **Quiz authoring upgrades**
    - Attach image per question (R2 key stored in D1).
    - Add category taxonomy (level, topic, skill).
    - Migrate draft JSON builder to structured D1 rows while retaining JSON drafts.

3. **Assignments & results**
    - Assign quizzes to classes/students with due dates.
    - Store per-question answers, score, timing, and attempt history.
    - Teacher reporting dashboard (class + student views).

4. **Live quiz sessions**
    - Durable Object per live session room.
    - WebSocket join, live question broadcast, realtime scoring.
    - Persist final session results to D1.

5. **Sharing & QR**
    - Shareable quiz links with optional access token.
    - Generate QR image in Worker and cache in R2.

6. **Internal drive**
    - Teacher uploads PDFs/audio/images to R2.
    - Folder/category structure stored in D1.
    - Permissions by class/student.

## Deliverables

- API routes for quiz CRUD, media upload, assignments, and results.
- Teacher UI: authoring, assignments, results, internal drive.
- Student UI: quiz runner (async) + live session join.
- QR share page for quick access.

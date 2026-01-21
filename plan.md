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
    - Configure R2 bindings for quiz + drive media (code uses `BUCKET` with `quiz-media/` and `drive-media/` prefixes).

2. **Admin access control**
    - [x] Define superadmin-only route guard + API protection.
    - [x] Build admin dashboard shell with overview metrics.
    - [x] Add admin API endpoints for org-wide stats (teachers, students, classes, assignments, quizzes, attempts).
    - [x] Add user management: list/search users, assign roles (teacher, student, admin, none).
    - [x] Add teacher assignment workflow to link students and teachers.
    - Add class management: list classes, view rosters, add/remove students.
    - Add detail views for teachers, students, and classes with assignment/results summaries.

## Deliverables

- API routes for quiz CRUD, media upload, assignments, and results.
- Teacher UI: authoring, assignments, results, internal drive.
- Student UI: quiz runner (async) + live session join.
- QR share page for quick access.

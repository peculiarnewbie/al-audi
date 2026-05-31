# al-audi Development Plan

Stack: Cloudflare Workers + D1 + R2 + Durable Objects. Frontend: TanStack Solid Start. Auth: Better Auth. Data validation: Effect Schema. Infra: Alchemy.

## Architecture

```
al-audi/
├── alchemy.run.ts              # Alchemy.Stack provisioning
├── packages/app/
│   ├── src/
│   │   ├── worker/index.ts     # Worker entry + exports GameRoom DO
│   │   ├── worker/db.ts        # DO Drizzle schema + client factory
│   │   ├── worker/ws.ts        # GameRoom Durable Object
│   │   ├── effect/             # Effect runtime, logger, schema-helpers
│   │   ├── db/                 # Drizzle schema (19 tables) + client
│   │   ├── auth/               # Better Auth + Effect middleware
│   │   ├── game/               # Game room (engine, adapter, server, connection)
│   │   ├── quiz/               # Quiz CRUD (schemas, handlers)
│   │   ├── drive/              # Drive (schemas, handlers)
│   │   ├── assignments/        # Assignments (schemas, handlers)
│   │   ├── reporting/          # Reporting (schemas)
│   │   ├── admin/              # Admin dashboard (schemas, handlers)
│   │   ├── server/             # createServerFn wrappers (Effect.runPromiseExit)
│   │   ├── components/         # Shared UI components
│   │   ├── routes/             # TanStack file-based routes
│   │   ├── routes/api/         # API routes
│   │   └── migrations/         # Squashed migration
```

## Key Principles

1. **Effect Schema at every boundary** — HTTP requests, WebSocket messages, DB queries. Never parse with Zod.
2. **Tagged errors everywhere** — `Data.TaggedError` for every failure mode.
3. **Pure engines** — Game logic and quiz scoring are pure functions (no I/O).
4. **createServerFn + Effect** — Server functions use `createServerFn` wrapping Effects via `Effect.runPromiseExit` + `Exit.match`. No HttpApi pattern.
5. **Alchemy for infra** — `Alchemy.Stack` + `Effect.gen` for all Cloudflare resources.
6. **One package** — No `core`/`www` split. Shared types live in `packages/app/src/db/schema.ts`.

## Data Model

19 Drizzle tables with matching Effect Schema exports:

- `users` (app users, role: none/student/teacher/admin, teacherId for student-teacher link)
- `user`, `session`, `account`, `verification` (Better Auth)
- `quizzes` + `quiz_questions` + `quiz_question_options` + `quiz_question_assets`
- `quiz_categories` + `quiz_category_links`
- `quiz_assignments`
- `quiz_attempts` + `quiz_responses`
- `live_quiz_results`
- `classes` + `class_students`
- `drive_assets` + `drive_folders` + `drive_folder_permissions`
- `quiz_share_links`

Consider: tags on drive_assets (many-to-many).

## What's Built (done)

- [x] Scaffold: single package, squashed migration, Effect utilities, Alchemy stack
- [x] Auth: Better Auth + Google OAuth + email/password, role-based middleware
- [x] Quiz: CRUD (R2 + D1), categories, share links, attempt + auto-scoring (22 tests)
- [x] Drive: file upload, folders, delete, R2 + D1 metadata (6 tests)
- [x] Assignments: create (quiz → class/student), list, status updates (5 tests)
- [x] Game room: pure engine, adapter, server dispatch, DO with WebSocket + SQLite persistence (14 tests)
- [x] Reporting: Effect Schema + server function + dashboard page
- [x] Admin: stats overview + user management (roles, teacher assignments)
- [x] Frontend: landing page, dashboard, drive UI, quiz editor, room lobby/play/results, reports, admin, profile
- [x] Dependencies: `effect` 4.0.0-beta.62, `alchemy` 2.0.0-beta.32, `drizzle-orm` rc, no zod/remeda
- [x] All 47 tests passing, build + typecheck clean

## What's Next

### 1. DO SQLite + Hibernation
- [x] Port `GameRoom` DO from in-memory state to DO SQLite via `drizzle-orm/durable-sqlite`
- [x] Enable hibernation with `acceptWebSocket` + tags + `serializeAttachment`
- [x] `roomId` from `ctx.id.name` (survives hibernation)
- [x] State loaded on wakeup via `blockConcurrencyWhile`, persisted after every message

### 2. Classroom Management UI
- [x] Create/update/delete classes (teacher-facing)
- [x] Add/remove students from classes
- [x] Server functions: getTeacherClassrooms, getClassroom, createClassroom, updateClassroom, deleteClassroom, getTeacherStudents, addStudentToClass, removeStudentFromClass
- [x] Routes: `/dashboard/classrooms/new` (create form), `/dashboard/classrooms/$classId` (detail + student management)
- [x] Dashboard "Manage" links + "New classroom" button

### 3. Quiz Listing / Index Page
- [x] Browse own quizzes with title, question count, categories, creation date
- [x] Search by title, filter by category
- [x] `name` column added to `quizzes` table (schema + migration `0001`)
- [x] Title field added to quiz editor UI
- [x] Server functions: `listQuizzes`, `listQuizCategories`
- [x] Route: `/quizzes` with search + category filter + edit action
- [x] Dashboard nav "My quizzes" link

### 4. Student-Facing Assignment Dashboard
- [x] View assigned quizzes with quiz name, teacher name, due date, status
- [x] Filter by status (All / Pending / Completed)
- [x] Overdue indicator for past-due pending assignments
- [x] Start assignment — loads questions (without answers) from D1
- [x] Answer MCQ + text questions, submit via submitQuizAttempt with assignmentId
- [x] View scores on completed work (existing attempt + responses)
- [x] Server functions: `getStudentAssignmentsWithDetails`, `getAssignmentQuizForPlay`
- [x] Routes: `/assignments` (list), `/assignments/$assignmentId` (play/results)
- [x] Dashboard sidebar "Assignments" nav link

### 5. Drive Folder Permissions UI
- [x] `getFolderPermissionsEffect` + `setFolderPermissionsEffect` (replace strategy: delete all + re-insert)
- [x] Server functions: `getFolderPermissions`, `setFolderPermissions`
- [x] Route: `/dashboard/drive` — folder listing + Permissions button per folder
- [x] Permission modal: select classes (checkboxes) + search/select individual students
- [x] Save replaces all permissions atomically

### 6. Reporting Drill-Down
- [x] Schemas: `AttemptDetail`, `StudentHistory`, `LiveSession` with full response/question details
- [x] Handlers: `getAttemptDetailEffect` (attempt + responses + questions + options), `getStudentHistoryEffect` (all attempts for a student with quiz names), `getLiveSessionsEffect` (grouped by roomId/sessionId)
- [x] Server functions: `getAttemptDetail`, `getStudentHistory`, `getLiveSessions` (createServerFn)
- [x] Route: `/reports/students/$studentId` — full student history with per-attempt scores, clickable into attempt detail
- [x] Route: `/reports/attempts/$attemptId` — question-by-question review (MCQ with option highlighting, text answer display), score summary card
- [x] Route: `/reports/live` — live session results table with per-player scores
- [x] Updated `/reports` page: student cards link to history, "Live sessions" link in header

### 7. Polish
- [x] File download/preview: download endpoint at `api/drive/media/$id` returns file from R2; drive page shows assets per folder with Download button
- [x] Drive search: search input on drive page filters both folders and assets by name
- [x] Live quiz game UI polish: timer bar with color change at 5s, spinner while loading, answer button states (selected/hover/disabled), progress bar for answer completion (host), ranked results with medals, "New game" button on end screen, loading spinner for waiting state
- [x] Quiz listing page empty state: was already implemented (shows message + CTA)
- Drive tags (skipped — types exist but no DB table, handlers, or UI)

### 8. Deploy
- Provision with Alchemy: `bun run alchemy deploy`
- Set env vars per stage
- Verify end-to-end flow

## Dependencies

Keep:
- `solid-js`, `@tanstack/solid-router`, `@tanstack/solid-start`
- `better-auth`
- `tailwindcss`, `wrangler`, `vite`
- `nanoid`, `animejs`, `luxon`, `qrcode`
- `effect` (includes `@effect/schema`)
- `alchemy`
- `drizzle-orm`, `drizzle-kit`

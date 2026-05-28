# al-audi Rewrite Plan

Full rewrite from imperative TanStack server functions + Zod + scattered DO storage into an Effect-first, Alchemy-managed architecture.

## References

Before implementing any part of this plan, read the two reference repos for patterns:

- **`/home/bolt/git/web/party`** — Game room infrastructure, Effect Schema at boundaries, `GameAdapter` strategy pattern, DO SQLite persistence, Effect-wrapped runtime, `runObservedPromiseExit`/`runObservedSync` wrappers, structured logging with `Effect.annotateLogs`, tagger error types via `Data.TaggedError`
- **`/home/bolt/git/web/shedflare/apps/drive`** — `Alchemy.Stack` + `Effect.gen` for infra, `effect/unstable/httpapi` for API definitions (`HttpApi`, `HttpApiGroup`, `HttpApiEndpoint`) + handlers (`HttpApiBuilder.group`), `createProtectedHandler` auth middleware, Effect Schema for request/response schemas

## Architecture

```
al-audi/
├── alchemy.run.ts          # Alchemy.Stack with Effect.gen (like shedflare)
├── packages/
│   └── app/                 # Single package (not core + www)
│       ├── alchemy.run.ts   # (or keep at root, one or the other)
│       ├── src/
│       │   ├── worker.ts    # Worker entry
│       │   ├── effect/      # Effect utilities (port from party)
│       │   │   ├── runtime.ts
│       │   │   ├── schema-helpers.ts
│       │   │   └── logger.ts
│       │   ├── db/
│       │   │   ├── schema.ts       # Drizzle tables + Effect schemas
│       │   │   └── client.ts       # createDb wrapper
│       │   ├── auth/
│       │   │   └── server.ts       # Better Auth setup (no change needed)
│       │   ├── game/               # Game room
│       │   │   ├── adapter.ts      # GameAdapter interface (see party)
│       │   │   ├── schemas.ts      # Shared wire schemas (Effect Schema)
│       │   │   ├── engine.ts       # Pure quiz logic (no I/O, testable)
│       │   │   ├── server.ts       # Message dispatch + broadcast
│       │   │   └── connection.ts   # Client-side WS wrapper
│       │   ├── quiz/               # Quiz CRUD (not game room)
│       │   │   ├── schemas.ts      # Effect Schema for quiz payloads
│       │   │   ├── api.ts          # HttpApi group (see shedflare drive)
│       │   │   └── handlers.ts     # HttpApiBuilder handlers
│       │   ├── drive/              # Resource drive
│       │   │   ├── schemas.ts
│       │   │   ├── api.ts
│       │   │   └── handlers.ts
│       │   ├── assignments/        # Quiz assignments
│       │   │   ├── schemas.ts
│       │   │   ├── api.ts
│       │   │   └── handlers.ts
│       │   ├── reporting/          # Teacher reports
│       │   │   ├── schemas.ts
│       │   │   └── api.ts
│       │   ├── admin/              # Admin dashboard
│       │   │   ├── schemas.ts
│       │   │   └── api.ts
│       │   ├── components/         # UI components
│       │   ├── routes/             # TanStack file-based routes
│       │   ├── worker/             # Durable Object
│       │   │   └── game-room.ts    # GameRoom DO (see party/worker/ws.ts)
│       │   └── styles/
│       └── migrations/              # Squashed single migration
```

## Data Model

Current 19 tables → consolidate to final form. Squash all 10 migrations into 1.

Key tables (Drizzle + Effect Schema from day one):
- `users` (app users, already better-auth + custom role)
- `user`, `session`, `account`, `verification` (better-auth tables)
- `quizzes` + `quiz_questions` + `quiz_question_options` + `quiz_question_assets`
- `quiz_categories` + `quiz_category_links`
- `quiz_assignments`
- `quiz_attempts` + `quiz_responses`
- `live_quiz_results`
- `classes` + `class_students`
- `drive_assets` + `drive_folders` + `drive_folder_permissions`
- `quiz_share_links`

Consider adding tags support to drive_assets (like shedflare's many-to-many tags).

## Module Design

Every domain module follows the same pattern (modeled after shedflare drive):

```
domain/
├── schemas.ts    # Effect Schema: request params, request body, response
├── api.ts        # HttpApi definitions (endpoints + groups)
└── handlers.ts   # HttpApiBuilder.group with createProtectedHandler
```

Each server function is an Effect, not an async function. Handlers use `Effect.gen` with typed errors via `Data.TaggedError`.

## Game Room Architecture

Follow the party repo's pattern rather than the current imperative DO:

```
game/
├── adapter.ts           # GameAdapter interface (see party/worker/game-adapter.ts)
├── schemas.ts           # clientMessageSchema, serverMessageSchema (Effect Schema)
├── engine.ts            # Pure functions, no I/O. Scoring, question validation.
├── server.ts            # Wraps engine, handles message → response mapping
└── connection.ts        # Client-side GameConnection (Solid signals + WS)
```

GameRoom DO (`worker/game-room.ts`) delegates to `GameAdapter.processMessage`. Use DO SQLite for persistence (not key-value API), with hibernation + alarms.

## Domain Modules

### Quiz CRUD (`quiz/`)
- Save/load quizzes (R2 for JSON payload, D1 for metadata)
- Share links (create, lookup with token)
- Categories (level, topic, skill)
- See shedflare drive for HttpApi pattern

### Drive (`drive/`)
- File upload (FormData → R2 + D1 metadata)
- Folders (create, list, delete)
- Download + preview (inline vs attachment)
- Search, filter, pagination
- See shedflare drive `server/impl/files.ts` for reference

### Assignments (`assignments/`)
- Create assignment (quiz → class or student)
- List (teacher view, student view)
- Status updates
- Access control (teacher owns, student matches)

### Reporting (`reporting/`)
- Per-quiz attempt summaries
- Per-student history
- Class overview
- Live session results

### Auth (`auth/`)
- Keep Better Auth setup (it works)
- Wrap auth calls in `Effect.tryPromise`
- `createProtectedHandler` middleware (like shedflare)

## Implementation Order

### 1. Scaffold
- Squash 10 migrations → 1 fresh migration
- Single `packages/app` package
- Port `effect/runtime.ts`, `effect/schema-helpers.ts`, `effect/logger.ts` from party
- Update `alchemy.run.ts` to use `Alchemy.Stack` + `Effect.gen` pattern (see shedflare)
- Remove `zod`, `remeda` from deps

### 2. Auth layer
- Port `auth/server.ts` as-is (it works)
- Add `createProtectedHandler` middleware (see shedflare `@shedflare/auth-client/http-api`)
- Add `getAuthenticatedDbUser` as an Effect

### 3. Quiz API
- [x] Define Effect schemas for quiz payloads (`quiz/schemas.ts`)
- [x] Implement quiz CRUD handlers with tagged errors (`quiz/handlers.ts`)
- [x] Rewrite `server/quiz.ts` to use Effect handlers via `Effect.runPromiseExit` + `Exit.match`
- [x] Tests pass (22 tests in `quiz/quiz.test.ts`), build clean

### 4. Drive API (in progress)
- `drive/schemas.ts` created — types for folders, files, upload/download, search, tags
- `drive/handlers.ts` — tagged error classes defined, effect handlers using raw Drizzle tables
  - Replaced `DriveFolderSelect`/`DriveAssetSelect` with raw `driveFolders`/`driveAsset` table references
  - Replaced `ISODateTime.now()` with `DateTime.now().valueOf()`
  - Fixed column names to match schema
  - R2 bucket accessed via `env.BUCKET` at runtime
- `server/drive.ts` — Effect-wrapped server functions implemented
  - All handlers using `Effect.sync()` + `Effect.runPromiseExit`
  - Auth middleware via `getAuthenticatedDbUser`
- **Build error**: Duplicate `db` declarations in `server/drive.ts` — need to refactor to use single db instance
- Still needed:
  - Fix duplicate `db` declaration in `server/drive.ts`
  - Write tests
  - Update drive routes to use new server fns

### 5. Assignments + Reporting
- Quiz assignment CRUD
- Attempt submission + scoring
- Reporting queries

### 6. Game Room
- Port `game/schemas.ts` to Effect Schema
- Extract pure `engine.ts` (scoring, validation)
- Implement `server.ts` (message dispatch)
- Implement `GameAdapter` interface
- Rewrite `GameRoom` DO with SQLite persistence
- Wire `GameConnection` client wrapper

### 7. Frontend
- Port SolidJS routes (keep TanStack router)
- Convert components to use new API shapes
- Drive UI overhaul (refer to shedflare drive `plan.md` for layout)

### 8. Cleanup
- Remove `packages/core`
- Remove `zod`, `remeda` dependencies
- Delete old API routes and server functions
- Typecheck + lint pass

## Dependencies

Keep:
- `solid-js`, `@tanstack/solid-router`, `@tanstack/solid-start`
- `better-auth`
- `tailwindcss`, `wrangler`, `vite`
- `nanoid`, `animejs`, `luxon`, `qrcode`

Bump to newest beta:
- `alchemy` — latest `2.0.0-beta.*` (use `Alchemy.Stack` + `Effect.gen` pattern from shedflare infra)
- `effect` — latest `4.0.0-beta.*` (Effect Schema, Data.TaggedError, `effect/unstable/httpapi`)
- `drizzle-orm` — latest `1.0.0-rc.*` (effect-schema integration, D1 driver stability)
- `drizzle-kit` — latest to match `drizzle-orm`

Remove:
- `zod` — replaced by Effect Schema
- `remeda` — `Effect` + native `Array` methods suffice

Add:
- `@effect/schema` (part of `effect` package already)
- `effect/unstable/httpapi` 

## Key Principles

1. **Effect Schema at every boundary** — HTTP requests, WebSocket messages, DB queries. Never parse with Zod.
2. **Tagged errors everywhere** — `Data.TaggedError` for every failure mode. No `{ success: false, error: string }`.
3. **Pure engines** — Game logic and quiz scoring are pure functions. No I/O. Testable with `bun test`.
4. **Alchemy for infra** — `Alchemy.Stack` + `Effect.gen` for all Cloudflare resources. No manual wrangler config drift.
5. **One package** — No `core`/`www` split. Shared types live in `packages/app/src/db/schema.ts` and are imported directly.
6. **HttpApi pattern** — All server endpoints defined as `HttpApi` groups with Schema-typed responses, not `createServerFn`.

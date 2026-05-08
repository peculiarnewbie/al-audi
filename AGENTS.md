# AGENTS.md

This document provides guidelines for agentic coding agents operating in this repository.

## Product Overview

This is the English Learning add-on app for an in-person school. It focuses on teacher-managed workflows, async homework, and real-time live quizzes. The stack is Cloudflare-first (Workers, D1, R2, Durable Objects) with a TanStack Solid Start frontend and Better Auth authentication.

## Repository Layout (Monorepo)

- `packages/core`: Shared data layer and types.
    - Drizzle D1 schema lives in `packages/core/src/db/schema.ts`.
    - SQL migrations live in `packages/core/src/migrations`.
    - Exported helper: `createDb` from `core` for D1 access.
- `packages/www`: Main application (TanStack Solid Start + Cloudflare Worker).
    - Routes: `packages/www/src/routes` (UI + API routes).
    - Server helpers: `packages/www/src/server`.
    - Durable Objects + Worker entry: `packages/www/src/worker`.
    - Game logic: `packages/www/src/game`.
    - UI components: `packages/www/src/components`.
    - Utilities: `packages/www/src/utils`.
    - Styles: `packages/www/src/styles`.

## Commands

Install dependencies from the repo root (workspace-aware package manager of choice).

```bash
bun install
```

Run app scripts from `packages/www`:

```bash
bun run dev
bun run build
bun run preview
bun run deploy
bun run cf-typegen
```

- `npm run cf-typegen` regenerates `packages/www/worker-configuration.d.ts`.
- `npm run build` runs `vite build && tsc --noEmit`.

## Testing

Tests use Bun’s runner (see `packages/www/src/game/game.test.ts`).

```bash
bun test
bun test src/game/game.test.ts
```

## Cloudflare Bindings & Storage

Bindings are defined in `packages/www/wrangler.jsonc`:

- `DB`: D1 database for quiz + school data.
- `BUCKET`: R2 storage (quiz and drive media).
- `WS`: Durable Object namespace for live quiz rooms (`GameRoom`).

Use `import { env } from "cloudflare:workers"` in server/worker code to access bindings.

Media storage conventions:

- Quiz assets are stored under `quiz-media/` in R2.
- Drive assets are stored under `drive-media/` in R2.

## Authentication

- Auth uses Better Auth (see `packages/www/src/utils/auth.server.ts`).
- Protect server handlers with `getAuthenticatedUser`.
- Required env vars are listed in `packages/www/.env.example`.

## Roadmap Alignment (plan.md)

Current milestones include quiz authoring, assignments, reporting, live sessions, sharing/QR, and internal drive (already implemented). The next planned milestone is admin access control:

- Add a superadmin dashboard to assign teacher accounts.
- Migrate `teachers` + `students` tables into a unified `users` table.
- Introduce roles (`none`, `student`, `teacher`, `admin`) and update all code paths.

When modifying the data model, update both the Drizzle schema and add a new SQL migration in `packages/core/src/migrations`.

## Frontend & Routing Conventions

- Routes use TanStack file-based routing and must export a named `Route`.
- API routes live under `packages/www/src/routes/api` and use `server.handlers`.
- Use Solid patterns (`createSignal`, `createMemo`, `Show`, `For`) instead of React equivalents.
- Tailwind is the primary styling approach (`class`, not `className`).

## TypeScript & Imports

- Strict mode is enabled. Use explicit types for public APIs.
- Path aliases:
    - `~/` maps to `packages/www/src`.
    - `core` maps to `packages/core/src`.
- Prefer `import type` for type-only imports.

## General Rules

- Do not add comments unless explicitly requested.
- Avoid emojis in code and commits.
- Prefer minimal, focused changes aligned with the plan.
- Do not commit changes unless explicitly requested.

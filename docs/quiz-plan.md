# Quiz Creator Plan

## Goals

- Add a signed-in-only quiz creator route at `/quizzes/new` in `packages/www`.
- Persist quiz metadata to D1 and quiz JSON payloads to R2.
- Provide a basic editor for multiple choice and text questions with a preview.

## Scope

- New core package at `packages/core` for shared types, schema, and database helpers.
- Drizzle ORM setup for D1 access.
- SolidStart route + server actions for create flow.
- Minimal UI with Tailwind classes and preview components.

## Data Model

- `quizzes` table
    - `id` (string, primary key)
    - `creator_id` (string)
    - `created_at` (timestamp)
    - `r2_key` (string)

## R2 Storage

- Store quiz JSON at `quizzes/{quizId}.json`.
- Persist the R2 key (not full URL) in D1.

## Route + Auth

- `/quizzes/new` route in `packages/www/src/routes`.
- Loader enforces authentication (redirect to sign-in if not signed in).
- Server action handles save: validates payload, writes to R2, inserts D1 record.

## Core Package Layout

- `packages/core/src/db/client.ts` for D1 Drizzle client helper.
- `packages/core/src/db/schema.ts` with `quizzes` table.
- `packages/core/src/types/quiz.ts` for quiz/question types.
- `packages/core/package.json` with exports and `drizzle-orm` dependency.

## UI Plan

- Editor state: quiz title (optional future), questions array.
- Question types:
    - Multiple choice: prompt + options + correct answer.
    - Text: prompt + free-form answer.
- Controls:
    - Add question
    - Remove question
    - Preview toggle
    - Submit

## Preview Components

- `QuizPreview` renders list of questions.
- `MultipleChoicePreview` renders options.
- `TextQuestionPreview` renders a text input placeholder.

## Validation

- Require at least one question.
- Multiple choice must have 2+ options.
- All prompts non-empty.

## Migration/SQL

- No migrations tooling added per request.
- Provide SQL snippet for creating `quizzes` table in documentation/comments if needed.

## Implementation Steps

1. Create `packages/core` package with exports and TypeScript config.
2. Add Drizzle ORM dependency and D1 client helper.
3. Define quiz types and D1 schema.
4. Build `/quizzes/new` route with auth-gated loader.
5. Implement quiz editor UI and preview components.
6. Implement server action to save to R2 + D1.
7. Ensure `wrangler types` remains valid with env bindings.

## Follow-ups (Optional)

- Add quiz title/description and list view.
- Add per-question image support.
- Add schema migration tooling if desired.

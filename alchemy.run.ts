import alchemy from "alchemy";
import {
    D1Database,
    DurableObjectNamespace,
    R2Bucket,
    Worker,
} from "alchemy/cloudflare";

const app = await alchemy("al-audi");

// ── D1 Database ────────────────────────────────────────────────
const db = await D1Database("db", {
    name: `${app.name}-${app.stage}-db`,
    // Keep the same migrations table Drizzle uses so existing migration
    // state is preserved when adopting an existing database.
    migrationsTable: "d1_migrations",
});

// ── R2 Bucket ──────────────────────────────────────────────────
const bucket = await R2Bucket("bucket", {
    name: `${app.name}-${app.stage}-bucket`,
});

// ── Durable Object ─────────────────────────────────────────────
const ws = await DurableObjectNamespace("ws", {
    className: "GameRoom",
});

// ── Worker ─────────────────────────────────────────────────────
// The Vite build (bun run build) outputs to packages/www/dist/.
// Alchemy bundles the server entrypoint and serves client assets.
const worker = await Worker("app", {
    name: `${app.name}-${app.stage}`,
    cwd: "./packages/www",
    entrypoint: "./dist/server/index.js",
    noBundle: true,
    compatibilityDate: "2026-01-01",
    compatibilityFlags: ["nodejs_compat"],
    url: true,
    assets: {
        path: "./dist/client",
        run_worker_first: false,
    },
    // Adopt any existing Worker/D1/R2 resources so Alchemy can
    // manage them going forward without recreating from scratch.
    adopt: true,
    bindings: {
        DB: db,
        BUCKET: bucket,
        WS: ws,
        MY_VAR: alchemy.env.MY_VAR ?? "Hello from Cloudflare",
    },
});

// ── Exports ────────────────────────────────────────────────────
export { app, db, bucket, ws, worker };

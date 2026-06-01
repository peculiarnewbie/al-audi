import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";

export const AppStack = Alchemy.Stack(
    "AlAudi",
    {
        providers: Cloudflare.providers(),
        state: Cloudflare.state(),
    },
    Effect.gen(function* () {
        const stage = yield* Alchemy.Stage;

        const suffix = stage === "production" ? "" : `-${stage}`;

        const db = yield* Cloudflare.D1Database("DB", {
            name: `al-audi${suffix}`,
            migrationsTable: "d1_migrations",
        });

        const bucket = yield* Cloudflare.R2Bucket("BUCKET", {
            name: `al-audi${suffix}`,
        });

        const ws = yield* Cloudflare.DurableObjectNamespace("WS", {
            className: "GameRoom",
        });

        const worker = yield* Cloudflare.Worker("App", {
            name: `al-audi${suffix}`,
            main: "packages/app/src/worker/index.ts",
            assets: {
                path: "packages/app/dist/client",
                runWorkerFirst: false,
            },
            compatibility: {
                date: "2026-01-01",
                flags: ["nodejs_compat"],
            },
            bindings: {
                DB: db,
                BUCKET: bucket,
                WS: ws,
            },
        });

        return {
            app: "al-audi" as const,
            workerName: worker.workerName,
            url: worker.url,
            dbId: db.databaseId,
            bucketName: bucket.bucketName,
        };
    }),
);

export default AppStack;

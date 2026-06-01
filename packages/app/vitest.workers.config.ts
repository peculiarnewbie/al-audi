import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers";

export default defineWorkersConfig({
    test: {
        include: ["src/**/*.integration.test.ts"],
        poolOptions: {
            workers: {
                wrangler: { configPath: "./wrangler.jsonc" },
                miniflare: {
                    d1Databases: ["DB"],
                    r2Buckets: ["BUCKET"],
                    durableObjects: {
                        WS: "GameRoom",
                    },
                },
            },
        },
    },
});

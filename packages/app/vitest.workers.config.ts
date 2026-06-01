import { defineConfig } from "vitest/config";
import { cloudflarePool, cloudflareTest } from "@cloudflare/vitest-pool-workers";

const poolOptions = {
    main: "src/worker/test-entry.ts",
    wrangler: {
        configPath: "./wrangler.jsonc",
        environment: "test",
    },
    miniflare: {
        d1Databases: ["DB"],
        r2Buckets: ["BUCKET"],
        durableObjects: {
            WS: "GameRoom",
        },
    },
};

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    plugins: [cloudflareTest(poolOptions)],
    test: {
        include: ["src/**/*.integration.test.ts"],
        // @ts-expect-error poolRunner is a valid vitest option supported by @cloudflare/vitest-pool-workers
        poolRunner: cloudflarePool(poolOptions),
    },
});

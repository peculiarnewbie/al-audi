import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        include: ["src/**/*.test.ts"],
        exclude: ["src/**/*.integration.test.ts", "e2e/**/*.spec.ts"],
    },
});

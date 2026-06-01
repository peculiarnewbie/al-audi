import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        include: ["src/**/*.test.ts"],
        exclude: ["src/**/*.integration.test.ts", "e2e/**/*.spec.ts"],
    },
});

import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "sqlite",
    schema: "./src/**/schema.ts",
    driver: "d1-http",
    out: "./src/migrations",
    casing: "snake_case",
    dbCredentials: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
        databaseId: process.env.DB_ID!,
        token: process.env.CLOUDFLARE_D1_TOKEN!,
    },
});

import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { drizzle } from "drizzle-orm/durable-sqlite";

export const gameKv = sqliteTable("game_kv", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
});

export function createDoDb(storage: DurableObjectStorage) {
    return drizzle(storage);
}

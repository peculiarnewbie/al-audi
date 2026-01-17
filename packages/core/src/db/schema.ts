import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const quizzes = sqliteTable("quizzes", {
    id: text("id").primaryKey(),
    creatorId: text("creator_id").notNull(),
    createdAt: integer("created_at").notNull(),
    r2Key: text("r2_key").notNull(),
});

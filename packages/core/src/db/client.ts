import { AnyD1Database, drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const createDb = (db: AnyD1Database) => drizzle(db, { schema });

export type DbClient = ReturnType<typeof createDb>;

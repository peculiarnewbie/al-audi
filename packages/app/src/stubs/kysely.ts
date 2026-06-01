export const DEFAULT_MIGRATION_LOCK_TABLE = "__drizzle_migrations_lock";
export const DEFAULT_MIGRATION_TABLE = "__drizzle_migrations";
export class CompiledQuery { }
export class DefaultQueryCompiler { }
export class SqliteAdapter { }
export class SqliteQueryCompiler { }
export function sql(s: any): any { return s; }
export class Kysely { }
export class MssqlDialect { }
export class MysqlDialect { }
export class PostgresDialect { }
export class SqliteDialect { }
export class SqliteConnection { }
export class D1Dialect { }
export class D1Connection { }
export class PostgresAdapter { }
export class PostgresIntrospectionBuilder { }
export class PostgresQueryCompiler { }
export class MysqlAdapter { }
export class MysqlIntrospectionBuilder { }
export class MysqlQueryCompiler { }
export class MssqlAdapter { }
export class MssqlIntrospectionBuilder { }
export class MssqlQueryCompiler { }
export class DialectAdapterBase { }
export const SingleUrlProvider = {};
export type Generated<T> = T;
export type ColumnType<A, B, C> = A | B | C;
export type Expression<T> = T;
export type KyselyConfig = Record<string, any>;
export type KyselyPlugin = Record<string, any>;
export type Selectable<T> = T;
export type Insertable<T> = T;
export type Updateable<T> = T;
export type ComparisonOperator = "=";
export type ReferenceExpression<DB, TB extends keyof DB, C extends keyof DB[TB]> = DB[TB][C];
export default {};

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start/solid";
import { env } from "cloudflare:workers";
import { eq, sql } from "drizzle-orm";
import { createDb } from "~/db/client";
import { users } from "~/db/schema";

export type AuthUser = {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
};

export type DbUser = typeof users.$inferSelect;

type AuthEnv = typeof env & {
    BETTER_AUTH_ADMIN_EMAILS?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
};
type AuthEnvKey =
    | "BETTER_AUTH_ADMIN_EMAILS"
    | "BETTER_AUTH_SECRET"
    | "BETTER_AUTH_URL"
    | "GOOGLE_CLIENT_ID"
    | "GOOGLE_CLIENT_SECRET";

const authEnv = env as AuthEnv;
const createAuth = () =>
    betterAuth({
        database: drizzleAdapter(createDb(env.DB), {
            provider: "sqlite",
        }),
        secret: getRequiredEnvValue("BETTER_AUTH_SECRET"),
        baseURL: normalizeEnvValue(authEnv.BETTER_AUTH_URL),
        emailAndPassword: {
            enabled: true,
            autoSignIn: true,
        },
        socialProviders: {
            google: {
                clientId: getRequiredEnvValue("GOOGLE_CLIENT_ID"),
                clientSecret: getRequiredEnvValue("GOOGLE_CLIENT_SECRET"),
            },
        },
        databaseHooks: {
            user: {
                create: {
                    before: async (user, _context) => {
                        const normalizedEmail = normalizeRequiredEmail(
                            user.email,
                        );
                        const existingUser = await findAppUserByEmail(
                            normalizedEmail,
                        );

                        return {
                            data: {
                                ...user,
                                id: existingUser?.id ?? user.id,
                                email: normalizedEmail,
                                name: normalizeName(
                                    user.name,
                                    existingUser?.name ?? normalizedEmail,
                                ),
                            },
                        };
                    },
                    after: async (user) => {
                        await ensureAppUser({
                            id: user.id,
                            email: user.email,
                            emailVerified: user.emailVerified,
                            image: user.image ?? null,
                            name: user.name,
                        });
                    },
                },
                update: {
                    after: async (user) => {
                        await syncAppUserProfile({
                            id: user.id,
                            email: user.email,
                            emailVerified: user.emailVerified,
                            image: user.image ?? null,
                            name: user.name,
                        });
                    },
                },
            },
        },
        plugins: [tanstackStartCookies()],
    });
type AuthInstance = ReturnType<typeof createAuth>;
let authInstance: AuthInstance | undefined;

export function getAuth(): AuthInstance {
    if (authInstance) {
        return authInstance;
    }

    authInstance = createAuth();

    return authInstance;
}

export async function getAuthenticatedUser(
    headers: Headers,
): Promise<AuthUser | null> {
    const session = await getAuth().api.getSession({ headers });

    if (!session) {
        return null;
    }

    await ensureAppUser(session.user);

    return {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        image: session.user.image ?? null,
        name: session.user.name,
    };
}

export async function getAuthenticatedDbUser(
    headers: Headers,
): Promise<DbUser | null> {
    const user = await getAuthenticatedUser(headers);

    if (!user) {
        return null;
    }

    return ensureAppUser(user);
}

export async function getAdminUser(headers: Headers): Promise<DbUser | null> {
    const dbUser = await getAuthenticatedDbUser(headers);

    if (!dbUser || dbUser.role !== "admin") {
        return null;
    }

    return dbUser;
}

async function ensureAppUser(user: AuthUser): Promise<DbUser | null> {
    const db = createDb(env.DB);
    const normalizedEmail = normalizeEmail(user.email);
    const name = normalizeName(user.name, normalizedEmail);
    const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

    if (existingUser) {
        if (
            existingUser.name !== name ||
            (existingUser.email ?? null) !== normalizedEmail
        ) {
            await db
                .update(users)
                .set({
                    email: normalizedEmail,
                    name,
                })
                .where(eq(users.id, user.id));

            return {
                ...existingUser,
                email: normalizedEmail,
                name,
            };
        }

        return existingUser;
    }

    const role = await resolveDefaultRole(normalizedEmail);

    await db.insert(users).values({
        id: user.id,
        role,
        teacherId: null,
        name,
        email: normalizedEmail,
        createdAt: Date.now(),
    });

    const [createdUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

    return createdUser ?? null;
}

async function syncAppUserProfile(user: AuthUser): Promise<void> {
    const db = createDb(env.DB);
    const normalizedEmail = normalizeEmail(user.email);
    const name = normalizeName(user.name, normalizedEmail);
    const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

    if (!existingUser) {
        await ensureAppUser(user);
        return;
    }

    if (
        existingUser.name === name &&
        (existingUser.email ?? null) === normalizedEmail
    ) {
        return;
    }

    await db
        .update(users)
        .set({
            email: normalizedEmail,
            name,
        })
        .where(eq(users.id, user.id));
}

async function findAppUserByEmail(email: string | null): Promise<DbUser | null> {
    if (!email) {
        return null;
    }

    const db = createDb(env.DB);
    const [existingUser] = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);

    return existingUser ?? null;
}

async function resolveDefaultRole(
    normalizedEmail: string | null,
): Promise<DbUser["role"]> {
    if (normalizedEmail && getBootstrapAdmins().has(normalizedEmail)) {
        return "admin";
    }

    const db = createDb(env.DB);
    const [adminCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "admin"));

    if ((adminCount?.count ?? 0) === 0) {
        return "admin";
    }

    return "none";
}

function getBootstrapAdmins() {
    return new Set(
        (authEnv.BETTER_AUTH_ADMIN_EMAILS ?? "")
            .split(",")
            .map((email: string) => normalizeEmail(email))
            .filter((email: string | null): email is string => Boolean(email)),
    );
}

function getRequiredEnvValue(key: AuthEnvKey) {
    const value = normalizeEnvValue(authEnv[key]);

    if (!value) {
        throw new Error(`Missing required auth env var: ${key}`);
    }

    return value;
}

function normalizeEmail(value: string | null | undefined) {
    const normalized = value?.trim().toLowerCase() ?? "";
    return normalized || null;
}

function normalizeRequiredEmail(value: string | null | undefined) {
    return normalizeEmail(value) ?? "";
}

function normalizeEnvValue(value: string | null | undefined) {
    const normalized = value?.trim() ?? "";
    return normalized || undefined;
}

function normalizeName(
    name: string | null | undefined,
    fallback?: string | null,
) {
    const normalized = name?.trim() ?? "";

    if (normalized) {
        return normalized;
    }

    if (fallback?.trim()) {
        return fallback.trim();
    }

    return "New User";
}

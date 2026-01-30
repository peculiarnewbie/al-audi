import { WorkOS } from "@workos-inc/node";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { createDb, users } from "core";

export type AuthUser = {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
};

export type DbUser = typeof users.$inferSelect;

export const WORKOS_COOKIE_NAME = "wos-session";

export const workos = new WorkOS(env.WORKOS_API_KEY, {
    clientId: env.WORKOS_CLIENT_ID,
});

export function getAuthorizationUrl(request: Request) {
    const redirectUri =
        env.WORKOS_REDIRECT_URI?.trim() ||
        new URL("/api/auth/callback", request.url).toString();

    return workos.userManagement.getAuthorizationUrl({
        provider: "authkit",
        redirectUri,
        clientId: env.WORKOS_CLIENT_ID,
    });
}

export function getSessionCookie(headers: Headers) {
    return getCookieValue(headers, WORKOS_COOKIE_NAME);
}

export async function getAuthenticatedUser(
    headers: Headers,
): Promise<AuthUser | null> {
    const sessionData = getSessionCookie(headers);

    if (!sessionData) {
        return null;
    }

    const session = workos.userManagement.loadSealedSession({
        sessionData,
        cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

    try {
        const result = await session.authenticate();

        if (!result.authenticated) {
            return null;
        }

        return result.user as AuthUser;
    } catch (error) {
        console.error("WorkOS session validation failed", error);
        return null;
    }
}

export async function getAuthenticatedDbUser(
    headers: Headers,
): Promise<DbUser | null> {
    const user = await getAuthenticatedUser(headers);

    if (!user) {
        return null;
    }

    const db = createDb(env.DB);
    const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

    return dbUser ?? null;
}

export async function getAdminUser(headers: Headers): Promise<DbUser | null> {
    const dbUser = await getAuthenticatedDbUser(headers);

    if (!dbUser || dbUser.role !== "admin") {
        return null;
    }

    return dbUser;
}

export async function getLogoutUrl(sessionData: string) {
    const session = workos.userManagement.loadSealedSession({
        sessionData,
        cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

    return session.getLogoutUrl();
}

export function buildSessionCookie(sessionData: string, isSecure: boolean) {
    return buildCookieValue(WORKOS_COOKIE_NAME, sessionData, {
        httpOnly: true,
        sameSite: "Lax",
        secure: isSecure,
        maxAge: 60 * 60 * 24 * 7,
    });
}

export function clearSessionCookie(isSecure: boolean) {
    return buildCookieValue(WORKOS_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "Lax",
        secure: isSecure,
        maxAge: 0,
    });
}

export function isSecureRequest(request: Request) {
    return new URL(request.url).protocol === "https:";
}

type CookieOptions = {
    httpOnly?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
    secure?: boolean;
    maxAge?: number;
};

function getCookieValue(headers: Headers, name: string) {
    const cookieHeader = headers.get("cookie");

    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

    for (const cookie of cookies) {
        if (!cookie.startsWith(`${name}=`)) {
            continue;
        }

        return decodeURIComponent(cookie.slice(name.length + 1));
    }

    return null;
}

function buildCookieValue(name: string, value: string, options: CookieOptions) {
    const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/"];

    if (options.httpOnly) {
        parts.push("HttpOnly");
    }

    if (options.sameSite) {
        parts.push(`SameSite=${options.sameSite}`);
    }

    if (options.secure) {
        parts.push("Secure");
    }

    if (typeof options.maxAge === "number") {
        parts.push(`Max-Age=${options.maxAge}`);
    }

    return parts.join("; ");
}

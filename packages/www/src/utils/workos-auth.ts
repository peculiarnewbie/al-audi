import { WorkOS } from "@workos-inc/node";
import { env } from "cloudflare:workers";

export type AuthUser = {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
};

export const WORKOS_COOKIE_NAME = "wos-session";

export const workos = new WorkOS(env.WORKOS_API_KEY, {
    clientId: env.WORKOS_CLIENT_ID,
});

export function getAuthorizationUrl() {
    return workos.userManagement.getAuthorizationUrl({
        provider: "authkit",
        redirectUri: env.WORKOS_REDIRECT_URI,
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

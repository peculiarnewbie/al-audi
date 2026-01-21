import { createFileRoute } from "@tanstack/solid-router";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { createDb, users } from "core";
import {
    buildSessionCookie,
    isSecureRequest,
    workos,
} from "~/utils/workos-auth.server";

const getUserDisplayName = (user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
}) => {
    const firstName = user.firstName?.trim() ?? "";
    const lastName = user.lastName?.trim() ?? "";
    const name = `${firstName} ${lastName}`.trim();

    if (name) {
        return name;
    }

    return user.email?.trim() || "New User";
};

export const Route = createFileRoute("/api/auth/callback")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const url = new URL(request.url);
                const code = url.searchParams.get("code");

                if (!code) {
                    return new Response("No code provided", { status: 400 });
                }

                try {
                    const { sealedSession, user } =
                        await workos.userManagement.authenticateWithCode({
                            code,
                            clientId: env.WORKOS_CLIENT_ID,
                            session: {
                                sealSession: true,
                                cookiePassword: env.WORKOS_COOKIE_PASSWORD,
                            },
                        });

                    if (!sealedSession || !user) {
                        throw new Error("Missing WorkOS session");
                    }

                    const db = createDb(env.DB);
                    const [existingUser] = await db
                        .select({ id: users.id })
                        .from(users)
                        .where(eq(users.id, user.id))
                        .limit(1);

                    if (!existingUser) {
                        await db.insert(users).values({
                            id: user.id,
                            role: "none",
                            teacherId: null,
                            name: getUserDisplayName(user),
                            email: user.email?.trim() ?? null,
                            createdAt: Date.now(),
                        });
                    }

                    const headers = new Headers({
                        Location: "/user",
                    });

                    headers.append(
                        "Set-Cookie",
                        buildSessionCookie(
                            sealedSession,
                            isSecureRequest(request),
                        ),
                    );

                    return new Response(null, { status: 302, headers });
                } catch (error) {
                    console.error("WorkOS callback failed", error);
                    return new Response(null, {
                        status: 302,
                        headers: {
                            Location: "/api/auth/sign-in",
                        },
                    });
                }
            },
        },
    },
});

import { createFileRoute } from "@tanstack/solid-router";
import { env } from "cloudflare:workers";
import {
    buildSessionCookie,
    isSecureRequest,
    workos,
} from "~/utils/workos-auth.server";

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
                    const { sealedSession } =
                        await workos.userManagement.authenticateWithCode({
                            code,
                            clientId: env.WORKOS_CLIENT_ID,
                            session: {
                                sealSession: true,
                                cookiePassword: env.WORKOS_COOKIE_PASSWORD,
                            },
                        });

                    if (!sealedSession) {
                        throw new Error("Missing WorkOS session");
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

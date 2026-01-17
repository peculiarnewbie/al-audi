import { createFileRoute } from "@tanstack/solid-router";
import {
    clearSessionCookie,
    getLogoutUrl,
    getSessionCookie,
    isSecureRequest,
} from "~/utils/workos-auth.server";

export const Route = createFileRoute("/api/auth/sign-out")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const sessionData = getSessionCookie(request.headers);
                const headers = new Headers();

                headers.append(
                    "Set-Cookie",
                    clearSessionCookie(isSecureRequest(request)),
                );

                if (!sessionData) {
                    headers.set("Location", "/");
                    return new Response(null, { status: 302, headers });
                }

                try {
                    const logoutUrl = await getLogoutUrl(sessionData);
                    headers.set("Location", logoutUrl);
                    return new Response(null, { status: 302, headers });
                } catch (error) {
                    console.error("WorkOS sign-out failed", error);
                    headers.set("Location", "/");
                    return new Response(null, { status: 302, headers });
                }
            },
        },
    },
});

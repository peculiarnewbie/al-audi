import { createFileRoute } from "@tanstack/solid-router";
import { env } from "cloudflare:workers";
import { getAuthorizationUrl } from "~/utils/workos-auth.server";

export const Route = createFileRoute("/api/auth/sign-in")({
    server: {
        handlers: {
            GET: ({ request }) => {
                const authorizationUrl = getAuthorizationUrl(request);
                console.log("authorization url", authorizationUrl);
                console.log(
                    "WorkOS key prefix",
                    env.WORKOS_API_KEY?.slice(0, 8),
                );

                return new Response(null, {
                    status: 302,
                    headers: {
                        Location: authorizationUrl,
                    },
                });
            },
        },
    },
});

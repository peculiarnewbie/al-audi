import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/api/auth/sign-in")({
    server: {
        handlers: {
            GET: ({ request }) => {
                const url = new URL(request.url);
                const next = url.searchParams.get("next");
                const location = next
                    ? `/sign-in?next=${encodeURIComponent(next)}`
                    : "/sign-in";

                return new Response(null, {
                    status: 302,
                    headers: {
                        Location: location,
                    },
                });
            },
        },
    },
});

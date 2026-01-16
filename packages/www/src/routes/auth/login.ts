import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/auth/login")({
    server: {
        handlers: {
            GET: async () => {
                return new Response("");
            },
        },
    },
});

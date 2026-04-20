import { createFileRoute } from "@tanstack/solid-router";
import { getAuth } from "~/utils/auth.server";

export const Route = createFileRoute("/api/auth/$")({
    server: {
        handlers: {
            GET: ({ request }) => getAuth().handler(request),
            POST: ({ request }) => getAuth().handler(request),
        },
    },
});

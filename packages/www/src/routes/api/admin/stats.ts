import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { getAdminStats } from "~/server/admin";

export const Route = createFileRoute("/api/admin/stats")({
    server: {
        handlers: {
            GET: async () => {
                const result = await getAdminStats(getRequestHeaders());

                if (result.status === "unauthenticated") {
                    return json(
                        { error: "You must be signed in." },
                        { status: 401 },
                    );
                }

                if (result.status === "forbidden") {
                    return json(
                        { error: "Admin access required." },
                        { status: 403 },
                    );
                }

                return json(result.stats);
            },
        },
    },
});

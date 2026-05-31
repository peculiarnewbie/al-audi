import { createFileRoute } from "@tanstack/solid-router";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { getAuthenticatedDbUser } from "~/utils/auth.server";

export const Route = createFileRoute("/api/room/$roomId")({
    server: {
        handlers: {
            GET: async ({ params, request }) => {
                const upgradeHeader = request.headers.get("Upgrade");
                if (!upgradeHeader || upgradeHeader !== "websocket") {
                    return new Response("Worker expected Upgrade: websocket", {
                        status: 426,
                    });
                }
                const user = await getAuthenticatedDbUser(getRequestHeaders());
                const durableRequest = new Request(request);
                if (user && (user.role === "teacher" || user.role === "admin")) {
                    durableRequest.headers.set("x-teacher-id", user.id);
                }
                const stub = env.WS.getByName(params.roomId);
                return await stub.fetch(durableRequest);
            },
        },
    },
});

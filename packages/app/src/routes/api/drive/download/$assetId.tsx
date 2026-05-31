import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { createDb } from "~/db/client";
import { driveAssets } from "~/db/schema";
import { getAuthenticatedUser } from "~/utils/auth.server";

export const Route = createFileRoute("/api/drive/download/$assetId")({
    server: {
        handlers: {
            GET: async ({ params }) => {
                const user = await getAuthenticatedUser(getRequestHeaders());
                if (!user) {
                    return json({ error: "You must be signed in." }, { status: 401 });
                }

                const db = createDb(env.DB);
                const [asset] = await db
                    .select()
                    .from(driveAssets)
                    .where(eq(driveAssets.id, params.assetId))
                    .limit(1);

                if (!asset) {
                    return json({ error: "File not found." }, { status: 404 });
                }

                if (asset.teacherId !== user.id) {
                    return json({ error: "Access denied." }, { status: 403 });
                }

                const obj = await env.BUCKET.get(asset.r2Key);
                if (!obj) {
                    return json({ error: "File not found in storage." }, { status: 404 });
                }

                const headers = new Headers();
                headers.set("Content-Type", asset.contentType);
                headers.set("Content-Disposition", `inline; filename="${asset.fileName}"`);
                headers.set("Content-Length", String(asset.fileSize));

                return new Response(obj.body, { headers });
            },
        },
    },
});

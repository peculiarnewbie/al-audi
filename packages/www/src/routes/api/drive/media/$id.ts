import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { createDb, driveAssets } from "core";
import { getAuthenticatedUser } from "~/utils/auth.server";

export const Route = createFileRoute("/api/drive/media/$id")({
    server: {
        handlers: {
            GET: async ({ params }) => {
                const user = await getAuthenticatedUser(getRequestHeaders());

                if (!user) {
                    return json(
                        { error: "You must be signed in." },
                        { status: 401 },
                    );
                }

                const id = params.id;
                const db = createDb(env.DB);

                const [asset] = await db
                    .select()
                    .from(driveAssets)
                    .where(
                        and(
                            eq(driveAssets.id, id),
                            eq(driveAssets.teacherId, user.id),
                        ),
                    )
                    .limit(1);

                if (!asset) {
                    return json({ error: "Asset not found." }, { status: 404 });
                }

                const file = await env.BUCKET.get(asset.r2Key);

                if (!file) {
                    return json({ error: "File not found." }, { status: 404 });
                }

                return new Response(file.body, {
                    headers: {
                        "Content-Type": asset.contentType,
                        "Content-Disposition": `attachment; filename="${asset.fileName}"`,
                    },
                });
            },
            DELETE: async ({ params }) => {
                const user = await getAuthenticatedUser(getRequestHeaders());

                if (!user) {
                    return json(
                        { error: "You must be signed in." },
                        { status: 401 },
                    );
                }

                const id = params.id;
                const db = createDb(env.DB);

                const [asset] = await db
                    .select()
                    .from(driveAssets)
                    .where(
                        and(
                            eq(driveAssets.id, id),
                            eq(driveAssets.teacherId, user.id),
                        ),
                    )
                    .limit(1);

                if (!asset) {
                    return json({ error: "Asset not found." }, { status: 404 });
                }

                await env.BUCKET.delete(asset.r2Key);

                await db.delete(driveAssets).where(eq(driveAssets.id, id));

                return json({ success: true });
            },
        },
    },
});

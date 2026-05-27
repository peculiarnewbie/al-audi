import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { createDb } from "~/db/client";
import {
    driveAssets,
    driveFolderPermissions,
    driveFolders,
} from "~/db/schema";
import { getAuthenticatedUser } from "~/utils/auth.server";

export const Route = createFileRoute("/api/drive/folders/$id")({
    server: {
        handlers: {
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

                const [folder] = await db
                    .select()
                    .from(driveFolders)
                    .where(
                        and(
                            eq(driveFolders.id, id),
                            eq(driveFolders.teacherId, user.id),
                        ),
                    )
                    .limit(1);

                if (!folder) {
                    return json(
                        { error: "Folder not found." },
                        { status: 404 },
                    );
                }

                const assetsInFolder = await db
                    .select({ r2Key: driveAssets.r2Key })
                    .from(driveAssets)
                    .where(eq(driveAssets.folderId, id));

                for (const asset of assetsInFolder) {
                    await env.BUCKET.delete(asset.r2Key);
                }

                await db
                    .delete(driveAssets)
                    .where(eq(driveAssets.folderId, id));

                await db
                    .delete(driveFolderPermissions)
                    .where(eq(driveFolderPermissions.folderId, id));

                await db.delete(driveFolders).where(eq(driveFolders.id, id));

                return json({ success: true });
            },
        },
    },
});

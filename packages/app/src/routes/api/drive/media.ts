import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createDb } from "~/db/client";
import { driveAssets, driveFolders } from "~/db/schema";
import { getAuthenticatedUser, getAuthenticatedDbUser } from "~/utils/auth.server";

const getFileExtension = (fileName: string) => {
    const trimmed = fileName.trim();
    const dotIndex = trimmed.lastIndexOf(".");

    if (dotIndex <= 0 || dotIndex === trimmed.length - 1) {
        return "";
    }

    const extension = trimmed
        .slice(dotIndex + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    return extension ? `.${extension}` : "";
};

const isAllowedContentType = (contentType: string) =>
    contentType.startsWith("image/") ||
    contentType.startsWith("audio/") ||
    contentType === "application/pdf";

export const Route = createFileRoute("/api/drive/media")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const user = await getAuthenticatedUser(getRequestHeaders());

                if (!user) {
                    return json(
                        { error: "You must be signed in." },
                        { status: 401 },
                    );
                }

                const url = new URL(request.url);
                const folderIdParam = url.searchParams.get("folderId");

                const db = createDb(env.DB);
                const conditions = [eq(driveAssets.teacherId, user.id)];
                if (folderIdParam) {
                    conditions.push(eq(driveAssets.folderId, folderIdParam));
                }
                const rows = await db
                    .select()
                    .from(driveAssets)
                    .where(and(...conditions))
                    .orderBy(driveAssets.createdAt);
                return json({
                    assets: rows.map((a) => ({
                        id: a.id,
                        folderId: a.folderId,
                        fileName: a.fileName,
                        contentType: a.contentType,
                        fileSize: a.fileSize,
                        createdAt: a.createdAt,
                    })),
                });
            },
            POST: async ({ request }) => {
                const user = await getAuthenticatedUser(getRequestHeaders());
                const dbUser = await getAuthenticatedDbUser(getRequestHeaders());

                if (!user || !dbUser) {
                    return json(
                        { error: "You must be signed in." },
                        { status: 401 },
                    );
                }

                if (dbUser.role !== "teacher" && dbUser.role !== "admin") {
                    return json(
                        { error: "Only teachers can upload files." },
                        { status: 403 },
                    );
                }

                const formData = await request.formData();
                const folderIdValue = formData.get("folderId");
                const file = formData.get("file");

                if (
                    (folderIdValue !== null &&
                        typeof folderIdValue !== "string") ||
                    !(file instanceof File)
                ) {
                    return json(
                        { error: "Invalid upload payload." },
                        { status: 400 },
                    );
                }

                const folderId =
                    typeof folderIdValue === "string"
                        ? folderIdValue.trim() || undefined
                        : undefined;
                if (folderId && !folderId.trim()) {
                    return json(
                        { error: "Invalid upload payload." },
                        { status: 400 },
                    );
                }

                const db = createDb(env.DB);

                if (folderId) {
                    const [folder] = await db
                        .select({ id: driveFolders.id })
                        .from(driveFolders)
                        .where(
                            and(
                                eq(driveFolders.id, folderId),
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
                }

                const contentType = file.type || "application/octet-stream";

                if (!isAllowedContentType(contentType)) {
                    return json(
                        {
                            error: "Only image, audio, or PDF uploads are allowed.",
                        },
                        { status: 400 },
                    );
                }

                const assetId = nanoid(10);
                const r2Key = `drive-media/${user.id}/${assetId}${getFileExtension(
                    file.name,
                )}`;

                await env.BUCKET.put(r2Key, file, {
                    httpMetadata: {
                        contentType,
                    },
                });

                await db.insert(driveAssets).values({
                    id: assetId,
                    teacherId: user.id,
                    folderId: folderId ?? null,
                    fileName: file.name,
                    r2Key,
                    contentType,
                    fileSize: file.size,
                    createdAt: Date.now(),
                });

                return json({ success: true, id: assetId, r2Key });
            },
        },
    },
});

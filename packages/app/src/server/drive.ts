import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { createDb } from "~/db/client";
import { driveAssets, driveFolders } from "~/db/schema";
import { getAuthenticatedDbUser } from "~/utils/auth.server";
import { env } from "cloudflare:workers";

import { createFolderEffect } from "~/drive/handlers";
import { listFoldersEffect } from "~/drive/handlers";
import { getFolderEffect } from "~/drive/handlers";
import { createFileEffect } from "~/drive/handlers";
import { deleteFileEffect } from "~/drive/handlers";
import { searchFilesEffect } from "~/drive/handlers";

export type DriveFolder = {
    id: string;
    name: string;
    parentId: string | null;
    createdAt: number;
    permissions: {
        classIds: string[];
        studentIds: string[];
    };
};

export type DriveAsset = {
    id: string;
    folderId: string | null;
    fileName: string;
    contentType: string;
    fileSize: number;
    createdAt: number;
};

export const getDriveFolders = createServerFn({ method: "GET" }).handler(
    async (): Promise<{ folders: DriveFolder[] }> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());
        if (!dbUser || (dbUser.role !== "teacher" && dbUser.role !== "admin")) {
            return { folders: [] };
        }

        const db = createDb(env.DB);
        const dbUserEffect = Effect.succeed(dbUser);

        const foldersEffect = Effect.sync(async () => {
            const conditions = [eq(driveFolders.teacherId, dbUser.id)];

            const folderRows = await db
                .select()
                .from(driveFolders)
                .where(and(...conditions));

            return {
                folders: folderRows.map((folder) => ({
                    id: folder.id,
                    name: folder.name,
                    parentId: folder.parentId,
                    createdAt: folder.createdAt,
                    permissions: {
                        classIds: [],
                        studentIds: [],
                    },
                })),
                hasMore: folderRows.length >= 100,
            };
        });

        const resultEffect = Effect.tryPromise({
            try: () => foldersEffect.runPromise(),
            catch: (e) => {
                return Effect.succeed({
                    folders: [],
                    error: "Failed to get folders.",
                });
            },
        });

        const result = await Effect.runPromiseExit(resultEffect);
        return result.success
            ? { folders: result.folders }
            : { folders: [], error: "Failed to get folders." };
    },
);

export const getDriveAssets = createServerFn({ method: "GET" }).handler(
    async (): Promise<{ assets: DriveAsset[] }> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());
        if (!dbUser || (dbUser.role !== "teacher" && dbUser.role !== "admin")) {
            return { assets: [] };
        }

        const db = createDb(env.DB);
        const dbUserEffect = Effect.succeed(dbUser);

        const assetsEffect = Effect.sync(async () => {
            const conditions = [eq(driveAssets.teacherId, dbUser.id)];

            const assets = await db
                .select()
                .from(driveAssets)
                .where(and(...conditions))
                .orderBy(driveAssets.createdAt);

            return {
                assets: assets.map((asset) => ({
                    id: asset.id,
                    folderId: asset.folderId,
                    fileName: asset.fileName,
                    contentType: asset.contentType,
                    fileSize: asset.fileSize,
                    createdAt: asset.createdAt,
                })),
            };
        });

        const resultEffect = Effect.tryPromise({
            try: () => assetsEffect.runPromise(),
            catch: (e) => {
                return Effect.succeed({
                    assets: [],
                    error: "Failed to get assets.",
                });
            },
        });

        const result = await Effect.runPromiseExit(resultEffect);
        return result.success
            ? { assets: result.assets }
            : { assets: [], error: "Failed to get assets." };
    },
);

export const createFolder = createServerFn({ method: "POST" }).handler(
    async (): Promise<{ id: string; name: string; parentId: string | null; tags: string[] }> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());
        if (!dbUser || (dbUser.role !== "teacher" && dbUser.role !== "admin")) {
            return { error: "Unauthorized" };
        }

        const body = await req.json();
        const input = body as { name: string; parentId?: string | null; tags?: string[] };

        const db = createDb(env.DB);
        const dbUserEffect = Effect.succeed(dbUser);

        const resultEffect = Effect.tryPromise({
            try: () => createFolderEffect(db, input),
            catch: (e) => {
                return Effect.succeed({
                    success: false,
                    error: "Failed to create folder.",
                });
            },
        });

        const result = await Effect.runPromiseExit(resultEffect);
        return result.success
            ? { id: result.id, name: result.name, parentId: result.parentId, tags: result.tags }
            : { error: result.error };
    },
);

export const listFolders = createServerFn({ method: "GET" }).handler(
    async (): Promise<{ folders: DriveFolder[]; hasMore: boolean; limit: number }> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());
        if (!dbUser || (dbUser.role !== "teacher" && dbUser.role !== "admin")) {
            return { folders: [], hasMore: false, limit: 0 };
        }

        const body = await req.json();
        const input = body as {
            limit?: number;
            offset?: number;
            sortBy?: "name" | "updatedAt";
            sortOrder?: "asc" | "desc";
            filterByType?: "all" | "files" | "folders" | "tags";
            folderId?: string;
        };

        const db = createDb(env.DB);
        const dbUserEffect = Effect.succeed(dbUser);

        const resultEffect = Effect.tryPromise({
            try: () => listFoldersEffect(db, input),
            catch: (e) => {
                return Effect.succeed({
                    folders: [],
                    hasMore: false,
                    limit: 0,
                    error: "Failed to list folders.",
                });
            },
        });

        const result = await Effect.runPromiseExit(resultEffect);
        return result.success
            ? { folders: result.folders, hasMore: result.hasMore, limit: result.limit }
            : { folders: [], hasMore: false, limit: 0, error: result.error };
    },
);

export const getFolder = createServerFn({ method: "GET" }).handler(
    async (): Promise<{ id: string; name: string; parentId: string | null; createdAt: number }> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());
        if (!dbUser || (dbUser.role !== "teacher" && dbUser.role !== "admin")) {
            return { error: "Unauthorized" };
        }

        const body = await req.json();
        const input = body as { id: string; shareId?: string; quizId?: string };

        const db = createDb(env.DB);
        const dbUserEffect = Effect.succeed(dbUser);

        const resultEffect = Effect.tryPromise({
            try: () => getFolderEffect(db, input),
            catch: (e) => {
                return Effect.succeed({
                    success: false,
                    error: "Failed to get folder.",
                });
            },
        });

        const result = await Effect.runPromiseExit(resultEffect);
        return result.success
            ? {
                  id: result.id,
                  name: result.name,
                  parentId: result.parentId,
                  createdAt: result.createdAt,
              }
            : { error: result.error };
    },
);

export const uploadFile = createServerFn({ method: "POST" }).handler(
    async (): Promise<{
        fileId: string;
        name: string;
        mimeType: string;
        size: number;
        uploadedAt: number;
    }> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());
        if (!dbUser || (dbUser.role !== "teacher" && dbUser.role !== "admin")) {
            return { error: "Unauthorized" };
        }

        const body = await req.json();
        const input = body as {
            name: string;
            mimeType: string;
            size: number;
            fileData: Blob;
            quizId?: string;
            tags?: string[];
        };

        const db = createDb(env.DB);
        const dbUserEffect = Effect.succeed(dbUser);

        const resultEffect = Effect.tryPromise({
            try: () =>
                createFileEffect(db, { upload: env.BUCKET.upload, delete: env.BUCKET.delete }, input),
            catch: (e) => {
                return Effect.succeed({
                    success: false,
                    error: e.message || "Failed to upload file.",
                });
            },
        });

        const result = await Effect.runPromiseExit(resultEffect);
        return result.success
            ? {
                  fileId: result.fileId,
                  name: result.name,
                  mimeType: result.mimeType,
                  size: result.size,
                  uploadedAt: result.uploadedAt,
              }
            : { error: result.error };
    },
);

export const deleteFile = createServerFn({ method: "DELETE" }).handler(
    async (): Promise<{ id: string; deleted: boolean }> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());
        if (!dbUser || (dbUser.role !== "teacher" && dbUser.role !== "admin")) {
            return { error: "Unauthorized" };
        }

        const body = await req.json();
        const input = body as { fileId: string };

        const db = createDb(env.DB);
        const dbUserEffect = Effect.succeed(dbUser);

        const resultEffect = Effect.tryPromise({
            try: () => deleteFileEffect(db, input),
            catch: (e) => {
                return Effect.succeed({
                    success: false,
                    error: e.message || "Failed to delete file.",
                });
            },
        });

        const result = await Effect.runPromiseExit(resultEffect);
        return result.success
            ? { id: result.id, deleted: result.deleted }
            : { error: result.error };
    },
);

export const searchFiles = createServerFn({ method: "GET" }).handler(
    async (): Promise<{ files: DriveAsset[]; total: number }> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());
        if (!dbUser || (dbUser.role !== "teacher" && dbUser.role !== "admin")) {
            return { files: [], total: 0 };
        }

        const body = await req.json();
        const input = body as {
            query?: string;
            folderId?: string;
            sortBy?: "name" | "updatedAt";
            sortOrder?: "asc" | "desc";
            limit?: number;
        };

        const db = createDb(env.DB);
        const dbUserEffect = Effect.succeed(dbUser);

        const resultEffect = Effect.tryPromise({
            try: () => searchFilesEffect(db, input),
            catch: (e) => {
                return Effect.succeed({
                    files: [],
                    total: 0,
                    error: e.message || "Failed to search files.",
                });
            },
        });

        const result = await Effect.runPromiseExit(resultEffect);
        return result.success
            ? { files: result.files, total: result.total }
            : { files: [], total: 0, error: result.error };
    },
);

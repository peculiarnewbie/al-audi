import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { Effect, Exit } from "effect";
import { createDb } from "~/db/client";
import { getAuthenticatedUser } from "~/utils/auth.server";
import {
    createFolderEffect,
    listFoldersEffect,
    getFolderEffect,
    createFileEffect,
    deleteFileEffect,
    searchFilesEffect,
    getFolderPermissionsEffect,
    setFolderPermissionsEffect,
} from "~/drive/handlers";

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

export type CreateFolderInput = {
    name: string;
    parentId?: string | null;
    tags?: string[];
};

export type ListFoldersInput = {
    limit?: number;
    offset?: number;
    sortBy?: "name" | "updatedAt";
    sortOrder?: "asc" | "desc";
    filterByType?: "all" | "files" | "folders" | "tags";
    folderId?: string;
};

export type GetFolderInput = {
    id: string;
    shareId?: string;
    quizId?: string;
};

export type UploadFileInput = {
    name: string;
    mimeType: string;
    size: number;
    fileData: Blob;
    quizId?: string;
    tags?: string[];
};

export type DeleteFileInput = {
    fileId: string;
};

export type SearchFilesInput = {
    query?: string;
    folderId?: string;
    sortBy?: "name" | "updatedAt";
    sortOrder?: "asc" | "desc";
    limit?: number;
};

export const getDriveFolders = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as ListFoldersInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in.", folders: [] as DriveFolder[] };

        const exit = await Effect.runPromiseExit(
            listFoldersEffect(createDb(env.DB), data),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({ success: true as const, folders: result.folders }),
            onFailure: () => ({ success: false as const, error: "Failed to list folders.", folders: [] as DriveFolder[] }),
        });
    });

export const getDriveAssets = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as { folderId?: string })
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in.", assets: [] as DriveAsset[] };

        const db = createDb(env.DB);
        const exit = await Effect.runPromiseExit(
            Effect.tryPromise({
                try: async () => {
                    const { eq } = await import("drizzle-orm");
                    const { driveAssets } = await import("~/db/schema");
                    const conditions: any[] = [eq(driveAssets.teacherId, user.id)];
                    if (data.folderId) {
                        conditions.push(eq(driveAssets.folderId, data.folderId));
                    }
                    const { and } = await import("drizzle-orm");
                    const assets = await db
                        .select()
                        .from(driveAssets)
                        .where(and(...conditions))
                        .orderBy(driveAssets.createdAt);
                    return {
                        assets: assets.map((a) => ({
                            id: a.id,
                            folderId: a.folderId,
                            fileName: a.fileName,
                            contentType: a.contentType,
                            fileSize: a.fileSize,
                            createdAt: a.createdAt,
                        })),
                    };
                },
                catch: () => ({ assets: [] }),
            }),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({ success: true as const, assets: result.assets }),
            onFailure: () => ({ success: false as const, error: "Failed to get assets.", assets: [] as DriveAsset[] }),
        });
    });

export const createFolder = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as CreateFolderInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            createFolderEffect(createDb(env.DB), data),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({
                success: true as const,
                id: result.id,
                name: result.name,
                parentId: result.parentId,
                tags: result.tags ?? [],
            }),
            onFailure: () => ({ success: false as const, error: "Failed to create folder." }),
        });
    });

export const listFolders = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as ListFoldersInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in.", folders: [] as DriveFolder[], hasMore: false, limit: 0 };

        const exit = await Effect.runPromiseExit(
            listFoldersEffect(createDb(env.DB), data),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({ success: true as const, folders: result.folders, hasMore: result.hasMore, limit: result.limit }),
            onFailure: () => ({ success: false as const, error: "Failed to list folders.", folders: [] as DriveFolder[], hasMore: false, limit: 0 }),
        });
    });

export const getFolder = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as GetFolderInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            getFolderEffect(createDb(env.DB), data),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({
                success: true as const,
                id: result.id,
                name: result.name,
                parentId: result.parentId,
                createdAt: result.createdAt,
            }),
            onFailure: () => ({ success: false as const, error: "Failed to get folder." }),
        });
    });

export const uploadFile = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as UploadFileInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            createFileEffect(
                createDb(env.DB),
                { put: (key: string, value: any, options?: any) => env.BUCKET.put(key, value, options), delete: (keys: string | string[]) => env.BUCKET.delete(keys).then(() => {}) },
                data,
            ),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({
                success: true as const,
                fileId: result.fileId,
                name: result.name,
                mimeType: result.mimeType,
                size: result.size,
                uploadedAt: result.uploadedAt,
            }),
            onFailure: () => ({ success: false as const, error: "Failed to upload file." }),
        });
    });

export const deleteFile = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as DeleteFileInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            deleteFileEffect(createDb(env.DB), data),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({ success: true as const, id: result.id, deleted: result.deleted }),
            onFailure: () => ({ success: false as const, error: "Failed to delete file." }),
        });
    });

export const searchFiles = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as SearchFilesInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in.", files: [] as DriveAsset[], total: 0 };

        const exit = await Effect.runPromiseExit(
            searchFilesEffect(createDb(env.DB), data as any),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({ success: true as const, files: result.files, total: result.total }),
            onFailure: () => ({ success: false as const, error: "Failed to search files.", files: [] as DriveAsset[], total: 0 }),
        });
    });

export const getFolderPermissions = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as { folderId: string })
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in.", classIds: [] as string[], studentIds: [] as string[] };

        const exit = await Effect.runPromiseExit(
            getFolderPermissionsEffect(createDb(env.DB), data.folderId),
        );
        return Exit.match(exit, {
            onSuccess: (p) => ({ success: true as const, classIds: p.classIds, studentIds: p.studentIds }),
            onFailure: () => ({ success: false as const, error: "Failed to load permissions.", classIds: [] as string[], studentIds: [] as string[] }),
        });
    });

export type SetFolderPermissionsInput = {
    folderId: string;
    classIds: string[];
    studentIds: string[];
};

export const setFolderPermissions = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as SetFolderPermissionsInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            setFolderPermissionsEffect(createDb(env.DB), data.folderId, user.id, data),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({ success: true as const, folderId: result.folderId }),
            onFailure: () => ({ success: false as const, error: "Failed to set permissions." }),
        });
    });

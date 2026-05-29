import { Data, Effect } from "effect";
import { and, eq, inArray } from "drizzle-orm";
import { createDb } from "~/db/client";
import { driveAssets, driveFolders, driveFolderPermissions } from "~/db/schema";
import type {
    FolderCreateInput,
    FileUploadRequest,
    FileDeleteRequest,
    SearchQuery,
} from "./schemas";

/**
 * Tagged errors for Drive
 */
export class DriveNotFound extends Data.TaggedError("DriveNotFound")<{}> {}

export class FolderNotFound extends Data.TaggedError("FolderNotFound")<{
    id: string;
}> {}

export class FileNotFound extends Data.TaggedError("FileNotFound")<{
    id: string;
}> {}

export class FileCorrupt extends Data.TaggedError("FileCorrupt")<{}> {}

export class FileSizeExceeded extends Data.TaggedError("FileSizeExceeded")<{}> {}

export class PermissionDenied extends Data.TaggedError("PermissionDenied")<{}> {}

export class FolderPermissionError extends Data.TaggedError("FolderPermissionError")<{
    message: string;
}> {}

/**
 * Effect handlers for Drive API
 */

export function createFolderEffect(
    db: ReturnType<typeof createDb>,
    input: FolderCreateInput,
) {
    return Effect.tryPromise({
        try: async () => {
            const { name, parentId } = input;
            if (!name) throw new Error("Folder name required");

            const [existing] = await db
                .select()
                .from(driveFolders)
                .where(eq(driveFolders.name, name))
                .limit(1);

            if (existing) {
                throw new Error("Folder already exists");
            }

            const folderId = crypto.randomUUID();
            await db
                .insert(driveFolders)
                .values({
                    id: folderId,
                    name,
                    parentId: parentId ?? null,
                    teacherId: "test",
                    createdAt: Date.now(),
                });

            return { id: folderId, name, parentId, tags: [] as string[] };
        },
        catch: () =>
            ({ success: false as const, error: "Failed to create folder." }),
    });
}

export function listFoldersEffect(
    db: ReturnType<typeof createDb>,
    input: {
        limit?: number;
        offset?: number;
        sortBy?: "name" | "updatedAt";
        sortOrder?: "asc" | "desc";
        filterByType?: "all" | "files" | "folders" | "tags";
        folderId?: string;
    },
) {
    return Effect.tryPromise({
        try: async () => {
            const { folderId } = input;

            const conditions: any[] = [];
            if (folderId) {
                conditions.push(eq(driveFolders.id, folderId));
            }

            const rows = await db
                .select()
                .from(driveFolders)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .orderBy(driveFolders.name);

            return {
                folders: rows,
                hasMore: false,
                limit: 100,
                total: rows.length,
            };
        },
        catch: () =>
            ({
                success: false as const,
                error: "Failed to list folders.",
                folders: [] as any[],
                hasMore: false,
                limit: 0,
            }),
    });
}

export function getFolderEffect(
    db: ReturnType<typeof createDb>,
    input: { id: string; shareId?: string; quizId?: string },
) {
    return Effect.tryPromise({
        try: async () => {
            const [folder] = await db
                .select()
                .from(driveFolders)
                .where(eq(driveFolders.id, input.id))
                .limit(1);

            if (!folder) throw new FolderNotFound({ id: input.id });

            return folder;
        },
        catch: () =>
            ({ success: false as const, error: "Failed to get folder." }),
    });
}

export function createFileEffect(
    db: ReturnType<typeof createDb>,
    bucket: {
        put: (key: string, value: BodyInit, options?: any) => Promise<any>;
        delete: (keys: string | string[]) => Promise<void>;
    },
    input: FileUploadRequest,
) {
    return Effect.tryPromise({
        try: async () => {
            const { name, mimeType, size, fileData, quizId } = input;
            if (size > 100 * 1024 * 1024)
                throw new FileSizeExceeded();

            const assetId = crypto.randomUUID();
            const now = Date.now();
            const key = `${quizId ? `${quizId}/` : "uploads/"}${assetId}-${name}`;

            await bucket.put(key, fileData, {
                httpMetadata: { contentType: mimeType },
            });

            await db
                .insert(driveAssets)
                .values({
                    id: assetId,
                    teacherId: "test",
                    folderId: null,
                    fileName: name,
                    r2Key: key,
                    contentType: mimeType,
                    fileSize: size,
                    createdAt: now,
                });

            return {
                fileId: assetId,
                name,
                mimeType,
                size,
                uploadedAt: now,
            };
        },
        catch: () =>
            ({ success: false as const, error: "Failed to upload file." }),
    });
}

export function deleteFileEffect(
    db: ReturnType<typeof createDb>,
    input: FileDeleteRequest,
) {
    return Effect.tryPromise({
        try: async () => {
            const [file] = await db
                .select()
                .from(driveAssets)
                .where(eq(driveAssets.id, input.fileId))
                .limit(1);

            if (!file) throw new FileNotFound({ id: input.fileId });

            return { id: input.fileId, deleted: true };
        },
        catch: () =>
            ({ success: false as const, error: "Failed to delete file." }),
    });
}

export function searchFilesEffect(
    db: ReturnType<typeof createDb>,
    input: SearchQuery,
) {
    return Effect.tryPromise({
        try: async () => {
            const { query, folderId, limit = 20, sortBy = "name", sortOrder = "asc" } = input;

            const conditions: any[] = [];
            if (query) {
                conditions.push(eq(driveAssets.fileName, query));
            }
            if (folderId) {
                conditions.push(eq(driveAssets.folderId, folderId));
            }

            const rows = await db
                .select()
                .from(driveAssets)
                .where(conditions.length > 0 ? and(...conditions) : undefined)
                .orderBy(driveAssets.createdAt)
                .limit(limit);

            return {
                files: rows,
                total: rows.length,
            };
        },
        catch: () =>
            ({
                success: false as const,
                error: "Failed to search files.",
                files: [] as any[],
                total: 0,
            }),
    });
}

export function getFolderPermissionsEffect(
    db: ReturnType<typeof createDb>,
    folderId: string,
) {
    return Effect.tryPromise({
        try: async () => {
            const rows = await db
                .select()
                .from(driveFolderPermissions)
                .where(eq(driveFolderPermissions.folderId, folderId));
            return {
                classIds: rows.filter((r) => r.classId).map((r) => r.classId!),
                studentIds: rows.filter((r) => r.studentId).map((r) => r.studentId!),
            };
        },
        catch: () => ({ classIds: [] as string[], studentIds: [] as string[] }),
    });
}

export function setFolderPermissionsEffect(
    db: ReturnType<typeof createDb>,
    folderId: string,
    teacherId: string,
    input: { classIds: string[]; studentIds: string[] },
) {
    return Effect.tryPromise({
        try: async () => {
            const [folder] = await db
                .select()
                .from(driveFolders)
                .where(eq(driveFolders.id, folderId))
                .limit(1);
            if (!folder) throw new FolderNotFound({ id: folderId });
            if (folder.teacherId !== teacherId) throw new PermissionDenied();

            await db.delete(driveFolderPermissions).where(eq(driveFolderPermissions.folderId, folderId));

            const now = Date.now();
            const rows: (typeof driveFolderPermissions.$inferInsert)[] = [];

            for (const classId of input.classIds) {
                rows.push({ id: crypto.randomUUID(), folderId, classId, studentId: null, createdAt: now });
            }
            for (const studentId of input.studentIds) {
                rows.push({ id: crypto.randomUUID(), folderId, studentId, classId: null, createdAt: now });
            }

            if (rows.length) {
                await db.insert(driveFolderPermissions).values(rows);
            }

            return { folderId, classIds: input.classIds, studentIds: input.studentIds };
        },
        catch: () => ({ success: false as const, error: "Failed to set permissions." }),
    });
}

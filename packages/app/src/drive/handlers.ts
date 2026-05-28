import { Data, Effect } from "effect";
import { and, eq, inArray } from "drizzle-orm";
import { DateTime } from "effect";
import { createDb } from "~/db/client";
import {
    DriveAssetSelect,
    DriveFolderSelect,
} from "~/db/schema";
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

/**
 * Effect handlers for Drive API
 */

export function createFolderEffect(
    db: ReturnType<typeof createDb>,
    input: FolderCreateInput,
) {
    return Effect.tryPromise({
        try: async () => {
            const { name, parentId, tags } = input;
            if (!name) throw new Error("Folder name required");

            const [folder] = await db
                .select()
                .from(driveFolders)
                .where(eq(driveFolders.name, name))
                .limit(1);

            if (folder) {
                throw new Error("Folder already exists");
            }

            const [created] = await db
                .insert(driveFolders)
                .values({
                    name,
                    parentId: parentId ?? null,
                    createdAt: DateTime.now().valueOf(),
                });

            return { id: created.id, name, parentId, tags: [] };
        },
        catch: (e) =>
            Effect.succeed({
                success: false,
                error: "Failed to create folder.",
            }),
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
            const {
                limit = 100,
                offset = 0,
                sortBy = "name",
                sortOrder = "asc",
                filterByType = "all",
                folderId,
            } = input;

            const whereClause: string[] = [];
            if (filterByType === "folders") {
                whereClause.push(driveFolders.teacherId.eq(null).equals());
            } else {
                whereClause.push(driveFolders.teacherId.is("test-teacher").equals());
            }
            if (folderId) {
                whereClause.push(driveFolders.folderId.eq(folderId).equals());
            }

            const conditions = whereClause.length === 1
                ? whereClause[0]
                : and(...whereClause);

            const { rows, total } = await db
                .select()
                .from(driveFolders)
                .where(conditions)
                .limit(limit)
                .offset(offset)
                .orderBy(sortBy, sortOrder);

            return {
                folders: rows,
                hasMore: rows.length < limit,
                limit,
                total,
            };
        },
        catch: (e) =>
            Effect.succeed({
                success: false,
                error: "Failed to list folders.",
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
        catch: (e) =>
            Effect.succeed({
                success: false,
                error: "Failed to get folder.",
            }),
    });
}

export function createFileEffect(
    db: ReturnType<typeof createDb>,
    bucket: {
        upload: (input: { key: string; size: number; blob: Blob; contentType: string }) => Promise<unknown>;
        delete: (input: { key: string }) => Promise<void>;
    },
    input: FileUploadRequest,
) {
    return Effect.tryPromise({
        try: async () => {
            const { name, mimeType, size, fileData, quizId, tags } = input;
            if (size > 100 * 1024 * 1024)
                throw new FileSizeExceeded();

            const [file] = await db
                .select()
                .from(DriveAssetSelect)
                .where(eq(DriveAssetSelect.fileName, name))
                .limit(1);

            if (file) throw new Error("File already exists");

            const [created] = await db
                .insert(driveAsset)
                .values({
                    name,
                    mimeType,
                    size,
                    quizId: quizId ?? null,
                    tags: tags ?? [],
                    createdAt: DateTime.now().valueOf(),
                });

            const key = `${quizId ? `${quizId}/` : "uploads/"}${name}`;
            await bucket.upload({
                key,
                size,
                blob: fileData,
                contentType: mimeType,
            });

            return {
                fileId: created.id,
                name,
                mimeType,
                size,
                uploadedAt: DateTime.now().valueOf(),
            };
        },
        catch: (e) =>
            Effect.succeed({
                success: false,
                error: "Failed to upload file.",
            }),
    });
}

export function deleteFileEffect(
    db: ReturnType<typeof createDb>,
    input: FileDeleteRequest,
) {
    return Effect.tryPromise({
        try: async () => {
            const [file] = await db
                .select({
                    id: DriveAssetSelect.id,
                    name: DriveAssetSelect.fileName,
                    quizId: DriveAssetSelect.quizId,
                })
                .from(DriveAssetSelect)
                .where(eq(DriveAssetSelect.id, input.id))
                .limit(1);

            if (!file) throw new FileNotFound({ id: input.id });

            const key = `${file.quizId ? `${file.quizId}/` : "uploads/"}${file.name}`;
            await env.BUCKET.delete({ key });

            await db.delete(driveAsset).where(eq(driveAsset.id, input.id));

            return { id: input.id, deleted: true };
        },
        catch: (e) =>
            Effect.succeed({
                success: false,
                error: "Failed to delete file.",
            }),
    });
}

export function searchFilesEffect(
    db: ReturnType<typeof createDb>,
    input: SearchQuery,
) {
    return Effect.tryPromise({
        try: async () => {
            const { query, folderId, limit = 20, sortBy = "name", sortOrder = "asc" } = input;

            const whereClause: string[] = [];
            if (query) {
                whereClause.push(driveAsset.fileName.match(new RegExp(query, "i")).equals());
            }
            if (folderId) {
                whereClause.push(inArray(driveAsset.folderId, [null, folderId]).equals());
            }

            const conditions = whereClause.length === 1
                ? whereClause[0]
                : and(...whereClause);

            const { rows, total } = await db
                .select()
                .from(DriveAssetSelect)
                .where(conditions)
                .limit(limit)
                .orderBy(sortBy, sortOrder);

            return {
                files: rows,
                total,
            };
        },
        catch: (e) =>
            Effect.succeed({
                success: false,
                error: "Failed to search files.",
            }),
    });
}

import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { and, eq, isNull } from "drizzle-orm";
import { createDb } from "~/db/client";
import { driveAssets, driveFolders } from "~/db/schema";
import { getAuthenticatedDbUser } from "~/utils/auth.server";

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
        const conditions = [eq(driveFolders.teacherId, dbUser.id)];

        const folderRows = await db
            .select()
            .from(driveFolders)
            .where(and(...conditions));

        const folders: DriveFolder[] = folderRows
            .map((folder) => ({
                id: folder.id,
                name: folder.name,
                parentId: folder.parentId,
                createdAt: folder.createdAt,
                permissions: {
                    classIds: [],
                    studentIds: [],
                },
            }))
            .sort((left, right) => left.name.localeCompare(right.name));

        return { folders };
    },
);

export const getDriveAssets = createServerFn({ method: "GET" }).handler(
    async (): Promise<{ assets: DriveAsset[] }> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());
        if (!dbUser || (dbUser.role !== "teacher" && dbUser.role !== "admin")) {
            return { assets: [] };
        }

        const db = createDb(env.DB);
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
    },
);

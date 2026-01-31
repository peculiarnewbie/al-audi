import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { eq, inArray, or } from "drizzle-orm";
import {
    classStudents,
    classes,
    createDb,
    driveAssets,
    driveFolderPermissions,
    driveFolders,
} from "core";
import { getAuthenticatedDbUser } from "~/utils/workos-auth.server";
import type { UserRole } from "~/utils/users";

type ClassroomRow = typeof classes.$inferSelect;
type ClassStudentRow = typeof classStudents.$inferSelect;
type DriveAssetRow = typeof driveAssets.$inferSelect;
type DriveFolderRow = typeof driveFolders.$inferSelect;

export type DashboardUser = {
    id: string;
    name: string;
    email: string | null;
    role: UserRole;
};

export type DashboardClassroom = {
    id: string;
    name: string;
    description: string | null;
    studentCount: number;
};

export type DashboardResource = {
    id: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    createdAt: number;
    folderName: string | null;
};

export type DashboardData = {
    user: DashboardUser;
    classrooms: DashboardClassroom[];
    resources: DashboardResource[];
};

const buildClassrooms = (
    classRows: ClassroomRow[],
    classStudentRows: ClassStudentRow[],
): DashboardClassroom[] => {
    const counts = new Map<string, number>();

    for (const row of classStudentRows) {
        counts.set(row.classId, (counts.get(row.classId) ?? 0) + 1);
    }

    return classRows
        .map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description ?? null,
            studentCount: counts.get(row.id) ?? 0,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
};

const buildResourceList = (
    assetRows: DriveAssetRow[],
    folderRows: DriveFolderRow[],
): DashboardResource[] => {
    const folderNames = new Map(
        folderRows.map((folder) => [folder.id, folder.name] as const),
    );

    return assetRows.map((asset) => ({
        id: asset.id,
        fileName: asset.fileName,
        contentType: asset.contentType,
        fileSize: asset.fileSize,
        createdAt: asset.createdAt,
        folderName: asset.folderId
            ? (folderNames.get(asset.folderId) ?? null)
            : null,
    }));
};

const limitResources = (resources: DashboardResource[]) =>
    [...resources]
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, 8);

export const getDashboardData = createServerFn({ method: "GET" }).handler(
    async (): Promise<DashboardData | null> => {
        const dbUser = await getAuthenticatedDbUser(getRequestHeaders());

        if (!dbUser) {
            return null;
        }

        const db = createDb(env.DB);
        let classRows: ClassroomRow[] = [];
        let classIds: string[] = [];

        if (dbUser.role === "teacher") {
            classRows = await db
                .select()
                .from(classes)
                .where(eq(classes.teacherId, dbUser.id));
            classIds = classRows.map((row) => row.id);
        } else if (dbUser.role === "student") {
            const membershipRows = await db
                .select({ classId: classStudents.classId })
                .from(classStudents)
                .where(eq(classStudents.studentId, dbUser.id));
            classIds = membershipRows.map((row) => row.classId);
            classRows = classIds.length
                ? await db
                      .select()
                      .from(classes)
                      .where(inArray(classes.id, classIds))
                : [];
        } else if (dbUser.role === "admin") {
            classRows = await db.select().from(classes);
            classIds = classRows.map((row) => row.id);
        }

        const classStudentRows = classIds.length
            ? await db
                  .select()
                  .from(classStudents)
                  .where(inArray(classStudents.classId, classIds))
            : [];
        const classrooms = buildClassrooms(classRows, classStudentRows);

        let resources: DashboardResource[] = [];

        if (dbUser.role === "teacher") {
            const assetRows = await db
                .select()
                .from(driveAssets)
                .where(eq(driveAssets.teacherId, dbUser.id));
            const folderIds = Array.from(
                new Set(
                    assetRows
                        .map((row) => row.folderId)
                        .filter((id): id is string => Boolean(id)),
                ),
            );
            const folderRows = folderIds.length
                ? await db
                      .select()
                      .from(driveFolders)
                      .where(inArray(driveFolders.id, folderIds))
                : [];
            resources = limitResources(
                buildResourceList(assetRows, folderRows),
            );
        } else if (dbUser.role === "student") {
            const permissionRows = await db
                .select({ folderId: driveFolderPermissions.folderId })
                .from(driveFolderPermissions)
                .where(
                    classIds.length
                        ? or(
                              eq(driveFolderPermissions.studentId, dbUser.id),
                              inArray(driveFolderPermissions.classId, classIds),
                          )
                        : eq(driveFolderPermissions.studentId, dbUser.id),
                );
            const folderIds = Array.from(
                new Set(permissionRows.map((row) => row.folderId)),
            );
            const assetRows = folderIds.length
                ? await db
                      .select()
                      .from(driveAssets)
                      .where(inArray(driveAssets.folderId, folderIds))
                : [];
            const folderRows = folderIds.length
                ? await db
                      .select()
                      .from(driveFolders)
                      .where(inArray(driveFolders.id, folderIds))
                : [];
            resources = limitResources(
                buildResourceList(assetRows, folderRows),
            );
        } else if (dbUser.role === "admin") {
            const assetRows = await db.select().from(driveAssets);
            const folderIds = Array.from(
                new Set(
                    assetRows
                        .map((row) => row.folderId)
                        .filter((id): id is string => Boolean(id)),
                ),
            );
            const folderRows = folderIds.length
                ? await db
                      .select()
                      .from(driveFolders)
                      .where(inArray(driveFolders.id, folderIds))
                : [];
            resources = limitResources(
                buildResourceList(assetRows, folderRows),
            );
        }

        return {
            user: {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email ?? null,
                role: dbUser.role,
            },
            classrooms,
            resources,
        };
    },
);

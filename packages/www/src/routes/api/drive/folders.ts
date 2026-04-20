import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
    classes,
    createDb,
    driveFolderPermissions,
    driveFolders,
    users,
} from "core";
import {
    getAuthenticatedUser,
    getAuthenticatedDbUser,
} from "~/utils/auth.server";

const createFolderSchema = z.object({
    name: z.string().trim().min(1),
    parentId: z.string().trim().min(1).optional(),
    classIds: z.array(z.string().trim().min(1)).optional(),
    studentIds: z.array(z.string().trim().min(1)).optional(),
});

const normalizeIds = (values?: string[]) =>
    Array.from(
        new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
    );

export const Route = createFileRoute("/api/drive/folders")({
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
                const parentIdParam = url.searchParams.get("parentId");
                const db = createDb(env.DB);
                const conditions = [eq(driveFolders.teacherId, user.id)];

                if (parentIdParam !== null) {
                    const trimmedParentId = parentIdParam.trim();

                    if (trimmedParentId) {
                        conditions.push(
                            eq(driveFolders.parentId, trimmedParentId),
                        );
                    } else {
                        conditions.push(isNull(driveFolders.parentId));
                    }
                }

                const folderRows = await db
                    .select()
                    .from(driveFolders)
                    .where(and(...conditions));
                const folderIds = folderRows.map((folder) => folder.id);
                const permissionRows = folderIds.length
                    ? await db
                          .select({
                              folderId: driveFolderPermissions.folderId,
                              classId: driveFolderPermissions.classId,
                              studentId: driveFolderPermissions.studentId,
                          })
                          .from(driveFolderPermissions)
                          .where(
                              inArray(
                                  driveFolderPermissions.folderId,
                                  folderIds,
                              ),
                          )
                    : [];
                const permissionsByFolderId = new Map<
                    string,
                    { classIds: string[]; studentIds: string[] }
                >();

                for (const permission of permissionRows) {
                    const entry = permissionsByFolderId.get(
                        permission.folderId,
                    ) ?? {
                        classIds: [],
                        studentIds: [],
                    };

                    if (permission.classId) {
                        entry.classIds.push(permission.classId);
                    }

                    if (permission.studentId) {
                        entry.studentIds.push(permission.studentId);
                    }

                    permissionsByFolderId.set(permission.folderId, entry);
                }

                const folders = folderRows
                    .map((folder) => ({
                        id: folder.id,
                        name: folder.name,
                        parentId: folder.parentId,
                        createdAt: folder.createdAt,
                        permissions: permissionsByFolderId.get(folder.id) ?? {
                            classIds: [],
                            studentIds: [],
                        },
                    }))
                    .sort((left, right) => left.name.localeCompare(right.name));

                return json({ folders });
            },
            POST: async ({ request }) => {
                const user = await getAuthenticatedUser(getRequestHeaders());
                const dbUser =
                    await getAuthenticatedDbUser(getRequestHeaders());

                if (!user || !dbUser) {
                    return json(
                        { error: "You must be signed in." },
                        { status: 401 },
                    );
                }

                if (dbUser.role !== "teacher" && dbUser.role !== "admin") {
                    return json(
                        { error: "Only teachers can create folders." },
                        { status: 403 },
                    );
                }

                let payload: unknown;

                try {
                    payload = await request.json();
                } catch (error) {
                    return json(
                        { error: "Invalid folder payload." },
                        { status: 400 },
                    );
                }

                const parsed = createFolderSchema.safeParse(payload);

                if (!parsed.success) {
                    return json(
                        { error: "Invalid folder payload." },
                        { status: 400 },
                    );
                }

                const name = parsed.data.name.trim();
                const parentId = parsed.data.parentId?.trim() || null;
                const classIds = normalizeIds(parsed.data.classIds);
                const studentIds = normalizeIds(parsed.data.studentIds);
                const db = createDb(env.DB);

                if (parentId) {
                    const [parentFolder] = await db
                        .select({ id: driveFolders.id })
                        .from(driveFolders)
                        .where(
                            and(
                                eq(driveFolders.id, parentId),
                                eq(driveFolders.teacherId, user.id),
                            ),
                        )
                        .limit(1);

                    if (!parentFolder) {
                        return json(
                            { error: "Parent folder not found." },
                            { status: 404 },
                        );
                    }
                }

                if (classIds.length) {
                    const classRows = await db
                        .select({ id: classes.id })
                        .from(classes)
                        .where(
                            and(
                                eq(classes.teacherId, user.id),
                                inArray(classes.id, classIds),
                            ),
                        );
                    const validClassIds = new Set(
                        classRows.map((row) => row.id),
                    );

                    if (
                        classIds.some((classId) => !validClassIds.has(classId))
                    ) {
                        return json(
                            { error: "Invalid class permissions." },
                            { status: 400 },
                        );
                    }
                }

                if (studentIds.length) {
                    const studentRows = await db
                        .select({ id: users.id })
                        .from(users)
                        .where(
                            and(
                                eq(users.role, "student"),
                                eq(users.teacherId, user.id),
                                inArray(users.id, studentIds),
                            ),
                        );
                    const validStudentIds = new Set(
                        studentRows.map((row) => row.id),
                    );

                    if (
                        studentIds.some(
                            (studentId) => !validStudentIds.has(studentId),
                        )
                    ) {
                        return json(
                            { error: "Invalid student permissions." },
                            { status: 400 },
                        );
                    }
                }

                const folderId = nanoid(10);
                const createdAt = Date.now();

                await db.insert(driveFolders).values({
                    id: folderId,
                    teacherId: user.id,
                    parentId,
                    name,
                    createdAt,
                });

                const permissionRows = [
                    ...classIds.map((classId) => ({
                        id: nanoid(10),
                        folderId,
                        classId,
                        studentId: null,
                        createdAt,
                    })),
                    ...studentIds.map((studentId) => ({
                        id: nanoid(10),
                        folderId,
                        classId: null,
                        studentId,
                        createdAt,
                    })),
                ];

                if (permissionRows.length) {
                    await db
                        .insert(driveFolderPermissions)
                        .values(permissionRows);
                }

                return json({
                    success: true,
                    folder: {
                        id: folderId,
                        name,
                        parentId,
                        createdAt,
                        permissions: {
                            classIds,
                            studentIds,
                        },
                    },
                });
            },
        },
    },
});

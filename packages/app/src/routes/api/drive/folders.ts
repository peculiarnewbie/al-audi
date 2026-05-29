import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { Effect, Exit } from "effect";
import { createDb } from "~/db/client";
import { driveFolders, classes, users, driveFolderPermissions } from "~/db/schema";
import { getAuthenticatedUser, getAuthenticatedDbUser } from "~/utils/auth.server";

function parseFolderPayload(payload: unknown): {
    name?: string;
    parentId?: string | null;
    classIds?: string[];
    studentIds?: string[];
} | null {
    if (typeof payload !== "object" || payload === null) return null;
    const obj = payload as Record<string, unknown>;
    if (typeof obj.name !== "string" || !obj.name.trim()) return null;
    const result: any = { name: obj.name.trim() };
    if (typeof obj.parentId === "string" && obj.parentId.trim()) result.parentId = obj.parentId.trim();
    if (Array.isArray(obj.classIds)) result.classIds = obj.classIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim());
    if (Array.isArray(obj.studentIds)) result.studentIds = obj.studentIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0).map((id) => id.trim());
    return result;
}

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
                const rows = await db
                    .select()
                    .from(driveFolders)
                    .where(eq(driveFolders.teacherId, user.id))
                    .orderBy(driveFolders.name);
                return json({
                    folders: rows.map((r) => ({
                        id: r.id,
                        name: r.name,
                        parentId: r.parentId,
                        createdAt: r.createdAt,
                        permissions: { classIds: [], studentIds: [] },
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

                const parsed = parseFolderPayload(payload);

                if (!parsed || !parsed.name) {
                    return json(
                        { error: "Invalid folder payload." },
                        { status: 400 },
                    );
                }

                const name = parsed.name;
                const parentId = parsed.parentId ?? null;
                const classIds = parsed.classIds ?? [];
                const studentIds = parsed.studentIds ?? [];
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

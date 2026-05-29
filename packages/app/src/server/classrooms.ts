import { env } from "cloudflare:workers";
import { and, eq, inArray, not } from "drizzle-orm";
import { createDb } from "~/db/client";
import { classes, classStudents, users } from "~/db/schema";
import { getAuthenticatedDbUser } from "~/utils/auth.server";

export type ClassroomDetail = {
    id: string;
    name: string;
    description: string | null;
    teacherId: string;
    createdAt: number;
    students: ClassroomStudent[];
};

export type ClassroomStudent = {
    id: string;
    name: string;
    email: string | null;
};

export type ClassroomResult =
    | { status: "ok"; classroom: ClassroomDetail }
    | { status: "unauthenticated" }
    | { status: "forbidden" }
    | { status: "not_found" };

export type ClassroomListResult =
    | { status: "ok"; classrooms: ClassroomDetail[] }
    | { status: "unauthenticated" }
    | { status: "forbidden" };

export type TeacherStudentsResult =
    | { status: "ok"; students: ClassroomStudent[] }
    | { status: "unauthenticated" }
    | { status: "forbidden" };

export type ClassroomMutationResult =
    | { status: "ok"; classroom: ClassroomDetail }
    | { status: "unauthenticated" }
    | { status: "forbidden" }
    | { status: "not_found" };

export type DeleteResult =
    | { status: "ok" }
    | { status: "unauthenticated" }
    | { status: "forbidden" }
    | { status: "not_found" };

async function getTeacherOrAdmin(headers: Headers) {
    const dbUser = await getAuthenticatedDbUser(headers);
    if (!dbUser) return { dbUser: null, error: { status: "unauthenticated" as const } };
    if (dbUser.role !== "teacher" && dbUser.role !== "admin") {
        return { dbUser: null, error: { status: "forbidden" as const } };
    }
    return { dbUser, error: null };
}

function loadClassroomDetail(
    db: ReturnType<typeof createDb>,
    classRow: typeof classes.$inferSelect,
    studentRows: (typeof classStudents.$inferSelect)[],
    userRows: (typeof users.$inferSelect)[],
): ClassroomDetail {
    const userMap = new Map(userRows.map((u) => [u.id, u]));
    return {
        id: classRow.id,
        name: classRow.name,
        description: classRow.description ?? null,
        teacherId: classRow.teacherId,
        createdAt: classRow.createdAt,
        students: studentRows
            .filter((s) => s.classId === classRow.id)
            .map((s) => {
                const u = userMap.get(s.studentId);
                return {
                    id: s.studentId,
                    name: u?.name ?? "Unknown",
                    email: u?.email ?? null,
                };
            }),
    };
}

export async function getTeacherClassrooms(
    headers: Headers,
): Promise<ClassroomListResult> {
    const { dbUser, error } = await getTeacherOrAdmin(headers);
    if (error) return error;

    const db = createDb(env.DB);
    const classRows = await db
        .select()
        .from(classes)
        .where(eq(classes.teacherId, dbUser!.id));

    if (!classRows.length) return { status: "ok", classrooms: [] };

    const classIds = classRows.map((r) => r.id);
    const studentRows = await db
        .select()
        .from(classStudents)
        .where(inArray(classStudents.classId, classIds));
    const studentIds = [...new Set(studentRows.map((r) => r.studentId))];
    const userRows = studentIds.length
        ? await db.select().from(users).where(inArray(users.id, studentIds))
        : [];

    return {
        status: "ok",
        classrooms: classRows.map((row) =>
            loadClassroomDetail(db, row, studentRows, userRows),
        ),
    };
}

export async function getClassroom(
    headers: Headers,
    classId: string,
): Promise<ClassroomResult> {
    const dbUser = await getAuthenticatedDbUser(headers);
    if (!dbUser) return { status: "unauthenticated" };

    const db = createDb(env.DB);
    const [classRow] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

    if (!classRow) return { status: "not_found" };

    if (
        dbUser.role !== "admin" &&
        classRow.teacherId !== dbUser.id &&
        dbUser.role !== "student"
    ) {
        return { status: "forbidden" };
    }

    if (dbUser.role === "student") {
        const [membership] = await db
            .select()
            .from(classStudents)
            .where(
                and(
                    eq(classStudents.classId, classId),
                    eq(classStudents.studentId, dbUser.id),
                ),
            )
            .limit(1);
        if (!membership) return { status: "forbidden" };
    }

    const studentRows = await db
        .select()
        .from(classStudents)
        .where(eq(classStudents.classId, classId));
    const studentIds = [...new Set(studentRows.map((r) => r.studentId))];
    const userRows = studentIds.length
        ? await db.select().from(users).where(inArray(users.id, studentIds))
        : [];

    return {
        status: "ok",
        classroom: loadClassroomDetail(db, classRow, studentRows, userRows),
    };
}

export async function createClassroom(
    headers: Headers,
    input: { name: string; description?: string },
): Promise<ClassroomMutationResult> {
    const { dbUser, error } = await getTeacherOrAdmin(headers);
    if (error) return error;

    const db = createDb(env.DB);
    const id = "cls_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const createdAt = Date.now();

    await db.insert(classes).values({
        id,
        teacherId: dbUser!.id,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        createdAt,
    });

    const [classRow] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

    return {
        status: "ok",
        classroom: loadClassroomDetail(db, classRow!, [], []),
    };
}

export async function updateClassroom(
    headers: Headers,
    classId: string,
    input: { name?: string; description?: string | null },
): Promise<ClassroomMutationResult> {
    const { dbUser, error } = await getTeacherOrAdmin(headers);
    if (error) return error;

    const db = createDb(env.DB);
    const [classRow] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

    if (!classRow) return { status: "not_found" };
    if (classRow.teacherId !== dbUser!.id) return { status: "forbidden" };

    const updates: Record<string, string | null> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.description !== undefined) updates.description = input.description?.trim() ?? null;

    await db.update(classes).set(updates).where(eq(classes.id, classId));

    return getClassroom(headers, classId);
}

export async function deleteClassroom(
    headers: Headers,
    classId: string,
): Promise<DeleteResult> {
    const { dbUser, error } = await getTeacherOrAdmin(headers);
    if (error) return error;

    const db = createDb(env.DB);
    const [classRow] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

    if (!classRow) return { status: "not_found" };
    if (classRow.teacherId !== dbUser!.id) return { status: "forbidden" };

    await db.delete(classStudents).where(eq(classStudents.classId, classId));
    await db.delete(classes).where(eq(classes.id, classId));

    return { status: "ok" };
}

export async function getTeacherStudents(
    headers: Headers,
    search?: string,
): Promise<TeacherStudentsResult> {
    const { dbUser, error } = await getTeacherOrAdmin(headers);
    if (error) return error;

    const db = createDb(env.DB);

    let studentRows: typeof users.$inferSelect[];
    if (search?.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        studentRows = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.role, "student"),
                    eq(users.teacherId, dbUser!.id),
                ),
            );
        studentRows = studentRows.filter(
            (u) =>
                u.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                (u.email ?? "").toLowerCase().includes(search.trim().toLowerCase()),
        );
    } else {
        studentRows = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.role, "student"),
                    eq(users.teacherId, dbUser!.id),
                ),
            );
    }

    return {
        status: "ok",
        students: studentRows.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email ?? null,
        })),
    };
}

export async function addStudentToClass(
    headers: Headers,
    classId: string,
    studentId: string,
): Promise<ClassroomMutationResult> {
    const { dbUser, error } = await getTeacherOrAdmin(headers);
    if (error) return error;

    const db = createDb(env.DB);
    const [classRow] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

    if (!classRow) return { status: "not_found" };
    if (classRow.teacherId !== dbUser!.id) return { status: "forbidden" };

    const [studentUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, studentId), eq(users.role, "student")))
        .limit(1);

    if (!studentUser) return { status: "not_found" };

    const [existing] = await db
        .select()
        .from(classStudents)
        .where(
            and(
                eq(classStudents.classId, classId),
                eq(classStudents.studentId, studentId),
            ),
        )
        .limit(1);

    if (!existing) {
        await db.insert(classStudents).values({
            id: `cs_${classId}_${studentId}`,
            classId,
            studentId,
            createdAt: Date.now(),
        });
    }

    return getClassroom(headers, classId);
}

export async function removeStudentFromClass(
    headers: Headers,
    classId: string,
    studentId: string,
): Promise<ClassroomMutationResult> {
    const { dbUser, error } = await getTeacherOrAdmin(headers);
    if (error) return error;

    const db = createDb(env.DB);
    const [classRow] = await db
        .select()
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

    if (!classRow) return { status: "not_found" };
    if (classRow.teacherId !== dbUser!.id) return { status: "forbidden" };

    await db
        .delete(classStudents)
        .where(
            and(
                eq(classStudents.classId, classId),
                eq(classStudents.studentId, studentId),
            ),
        );

    return getClassroom(headers, classId);
}

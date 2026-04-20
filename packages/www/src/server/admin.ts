import { env } from "cloudflare:workers";
import { and, eq, like, or, sql } from "drizzle-orm";
import {
    classes,
    createDb,
    quizAssignments,
    quizAttempts,
    quizzes,
    users,
} from "core";
import { getAuthenticatedDbUser } from "~/utils/auth.server";

export type AdminStats = {
    teachers: number;
    students: number;
    pending: number;
    classes: number;
    assignments: number;
    quizzes: number;
    attempts: number;
    generatedAt: number;
};

export type AdminStatsResult =
    | { status: "ok"; stats: AdminStats }
    | { status: "unauthenticated" }
    | { status: "forbidden" };

export type UserRole = (typeof users.$inferSelect)["role"];

export type AdminUserSummary = {
    id: string;
    name: string;
    email: string | null;
    role: UserRole;
    teacherId: string | null;
    createdAt: number;
};

export type AdminUserListResult =
    | { status: "ok"; users: AdminUserSummary[] }
    | { status: "unauthenticated" }
    | { status: "forbidden" };

export type AdminUserResult =
    | { status: "ok"; user: AdminUserSummary }
    | { status: "unauthenticated" }
    | { status: "forbidden" }
    | { status: "not_found" };

const adminUserSelect = {
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    teacherId: users.teacherId,
    createdAt: users.createdAt,
};

export async function getAdminStats(
    headers: Headers,
): Promise<AdminStatsResult> {
    const dbUser = await getAuthenticatedDbUser(headers);

    if (!dbUser) {
        return { status: "unauthenticated" };
    }

    if (dbUser.role !== "admin") {
        return { status: "forbidden" };
    }

    const db = createDb(env.DB);
    const [
        teacherRows,
        studentRows,
        pendingRows,
        classRows,
        assignmentRows,
        quizRows,
        attemptRows,
    ] = await Promise.all([
        db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.role, "teacher")),
        db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.role, "student")),
        db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.role, "none")),
        db.select({ count: sql<number>`count(*)` }).from(classes),
        db.select({ count: sql<number>`count(*)` }).from(quizAssignments),
        db.select({ count: sql<number>`count(*)` }).from(quizzes),
        db.select({ count: sql<number>`count(*)` }).from(quizAttempts),
    ]);

    return {
        status: "ok",
        stats: {
            teachers: teacherRows[0]?.count ?? 0,
            students: studentRows[0]?.count ?? 0,
            pending: pendingRows[0]?.count ?? 0,
            classes: classRows[0]?.count ?? 0,
            assignments: assignmentRows[0]?.count ?? 0,
            quizzes: quizRows[0]?.count ?? 0,
            attempts: attemptRows[0]?.count ?? 0,
            generatedAt: Date.now(),
        },
    };
}

export async function getAdminUsers(
    headers: Headers,
    search?: string,
    role?: UserRole,
): Promise<AdminUserListResult> {
    const dbUser = await getAuthenticatedDbUser(headers);

    if (!dbUser) {
        return { status: "unauthenticated" };
    }

    if (dbUser.role !== "admin") {
        return { status: "forbidden" };
    }

    const db = createDb(env.DB);
    const trimmedSearch = search?.trim();
    const baseQuery = db.select(adminUserSelect).from(users);
    const searchCondition = trimmedSearch
        ? or(
              like(
                  sql`lower(${users.name})`,
                  `%${trimmedSearch.toLowerCase()}%`,
              ),
              like(
                  sql`lower(${users.email})`,
                  `%${trimmedSearch.toLowerCase()}%`,
              ),
              like(sql`lower(${users.id})`, `%${trimmedSearch.toLowerCase()}%`),
          )
        : null;
    let rows: AdminUserSummary[];

    if (searchCondition && role) {
        rows = await baseQuery.where(
            and(searchCondition, eq(users.role, role)),
        );
    } else if (searchCondition) {
        rows = await baseQuery.where(searchCondition);
    } else if (role) {
        rows = await baseQuery.where(eq(users.role, role));
    } else {
        rows = await baseQuery;
    }
    rows.sort((left, right) => left.name.localeCompare(right.name));

    return { status: "ok", users: rows };
}

export async function getAdminUser(
    headers: Headers,
    userId: string,
): Promise<AdminUserResult> {
    const dbUser = await getAuthenticatedDbUser(headers);

    if (!dbUser) {
        return { status: "unauthenticated" };
    }

    if (dbUser.role !== "admin") {
        return { status: "forbidden" };
    }

    const db = createDb(env.DB);
    const [user] = await db
        .select(adminUserSelect)
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!user) {
        return { status: "not_found" };
    }

    return { status: "ok", user };
}

export async function updateAdminUserRole(
    headers: Headers,
    userId: string,
    role: UserRole,
): Promise<AdminUserResult> {
    const dbUser = await getAuthenticatedDbUser(headers);

    if (!dbUser) {
        return { status: "unauthenticated" };
    }

    if (dbUser.role !== "admin") {
        return { status: "forbidden" };
    }

    const db = createDb(env.DB);
    const [existingUser] = await db
        .select({ id: users.id, teacherId: users.teacherId })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!existingUser) {
        return { status: "not_found" };
    }

    const nextTeacherId = role === "student" ? existingUser.teacherId : null;

    await db
        .update(users)
        .set({ role, teacherId: nextTeacherId })
        .where(eq(users.id, userId));

    const [updatedUser] = await db
        .select(adminUserSelect)
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

    if (!updatedUser) {
        return { status: "not_found" };
    }

    return { status: "ok", user: updatedUser };
}

export async function updateAdminStudentTeacher(
    headers: Headers,
    studentId: string,
    teacherId: string | null,
): Promise<AdminUserResult> {
    const dbUser = await getAuthenticatedDbUser(headers);

    if (!dbUser) {
        return { status: "unauthenticated" };
    }

    if (dbUser.role !== "admin") {
        return { status: "forbidden" };
    }

    const db = createDb(env.DB);
    const [student] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, studentId))
        .limit(1);

    if (!student || student.role !== "student") {
        return { status: "not_found" };
    }

    if (teacherId) {
        const [teacher] = await db
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, teacherId), eq(users.role, "teacher")))
            .limit(1);

        if (!teacher) {
            return { status: "not_found" };
        }
    }

    await db.update(users).set({ teacherId }).where(eq(users.id, studentId));

    const [updatedUser] = await db
        .select(adminUserSelect)
        .from(users)
        .where(eq(users.id, studentId))
        .limit(1);

    if (!updatedUser) {
        return { status: "not_found" };
    }

    return { status: "ok", user: updatedUser };
}

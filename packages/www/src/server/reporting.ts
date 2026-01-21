import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { eq, inArray } from "drizzle-orm";
import {
    classStudents,
    classes,
    createDb,
    quizAssignments,
    quizAttempts,
    students,
} from "core";
import { getAuthenticatedUser } from "~/utils/workos-auth.server";

type AttemptRow = typeof quizAttempts.$inferSelect;
type AssignmentRow = typeof quizAssignments.$inferSelect;

type AttemptSummary = {
    attemptCount: number;
    averageScore: number | null;
    lastAttemptAt: number | null;
};

type ClassReport = {
    id: string;
    name: string;
    description: string | null;
    studentCount: number;
    assignmentCount: number;
    attemptCount: number;
    averageScore: number | null;
    lastAttemptAt: number | null;
};

type StudentReport = {
    id: string;
    name: string;
    email: string | null;
    classCount: number;
    assignmentCount: number;
    attemptCount: number;
    averageScore: number | null;
    lastAttemptAt: number | null;
};

export type TeacherReportData = {
    classes: ClassReport[];
    students: StudentReport[];
    generatedAt: number;
};

const summarizeAttempts = (attempts: AttemptRow[]): AttemptSummary => {
    let totalPercent = 0;
    let percentCount = 0;
    let lastAttemptAt: number | null = null;

    for (const attempt of attempts) {
        const attemptTime =
            attempt.completedAt ?? attempt.startedAt ?? attempt.createdAt;

        if (typeof attemptTime === "number") {
            lastAttemptAt =
                lastAttemptAt === null
                    ? attemptTime
                    : Math.max(lastAttemptAt, attemptTime);
        }

        if (
            typeof attempt.score === "number" &&
            typeof attempt.maxScore === "number" &&
            attempt.maxScore > 0
        ) {
            totalPercent += (attempt.score / attempt.maxScore) * 100;
            percentCount += 1;
        }
    }

    return {
        attemptCount: attempts.length,
        averageScore: percentCount
            ? Math.round(totalPercent / percentCount)
            : null,
        lastAttemptAt,
    };
};

export const getTeacherReport = createServerFn({ method: "GET" }).handler(
    async (): Promise<TeacherReportData | null> => {
        const user = await getAuthenticatedUser(getRequestHeaders());

        if (!user) {
            return null;
        }

        const db = createDb(env.DB);
        const [classRows, studentRows, assignments, attempts] =
            await Promise.all([
                db.select().from(classes).where(eq(classes.teacherId, user.id)),
                db
                    .select()
                    .from(students)
                    .where(eq(students.teacherId, user.id)),
                db
                    .select()
                    .from(quizAssignments)
                    .where(eq(quizAssignments.teacherId, user.id)),
                db
                    .select()
                    .from(quizAttempts)
                    .where(eq(quizAttempts.teacherId, user.id)),
            ]);

        const classIds = classRows.map((row) => row.id);
        const classStudentRows = classIds.length
            ? await db
                  .select()
                  .from(classStudents)
                  .where(inArray(classStudents.classId, classIds))
            : [];
        const studentIdsByClass = new Map<string, string[]>();
        const classIdsByStudent = new Map<string, string[]>();

        for (const row of classStudentRows) {
            const classList = studentIdsByClass.get(row.classId) ?? [];
            classList.push(row.studentId);
            studentIdsByClass.set(row.classId, classList);

            const studentList = classIdsByStudent.get(row.studentId) ?? [];
            studentList.push(row.classId);
            classIdsByStudent.set(row.studentId, studentList);
        }

        const attemptsByStudent = new Map<string, AttemptRow[]>();

        for (const attempt of attempts) {
            const list = attemptsByStudent.get(attempt.studentId) ?? [];
            list.push(attempt);
            attemptsByStudent.set(attempt.studentId, list);
        }

        const assignmentsByClass = new Map<string, AssignmentRow[]>();
        const assignmentsByStudent = new Map<string, AssignmentRow[]>();

        for (const assignment of assignments) {
            if (assignment.classId) {
                const list = assignmentsByClass.get(assignment.classId) ?? [];
                list.push(assignment);
                assignmentsByClass.set(assignment.classId, list);
            }

            if (assignment.studentId) {
                const list =
                    assignmentsByStudent.get(assignment.studentId) ?? [];
                list.push(assignment);
                assignmentsByStudent.set(assignment.studentId, list);
            }
        }

        const classReports = classRows
            .map<ClassReport>((classRow) => {
                const studentIds = studentIdsByClass.get(classRow.id) ?? [];
                const classAttempts: AttemptRow[] = [];

                for (const studentId of studentIds) {
                    const studentAttempts =
                        attemptsByStudent.get(studentId) ?? [];
                    classAttempts.push(...studentAttempts);
                }

                const summary = summarizeAttempts(classAttempts);
                const classAssignments =
                    assignmentsByClass.get(classRow.id) ?? [];

                return {
                    id: classRow.id,
                    name: classRow.name,
                    description: classRow.description ?? null,
                    studentCount: studentIds.length,
                    assignmentCount: classAssignments.length,
                    attemptCount: summary.attemptCount,
                    averageScore: summary.averageScore,
                    lastAttemptAt: summary.lastAttemptAt,
                };
            })
            .sort((left, right) => left.name.localeCompare(right.name));

        const studentReports = studentRows
            .map<StudentReport>((studentRow) => {
                const studentAttempts =
                    attemptsByStudent.get(studentRow.id) ?? [];
                const summary = summarizeAttempts(studentAttempts);
                const classIdsForStudent =
                    classIdsByStudent.get(studentRow.id) ?? [];
                const directAssignments =
                    assignmentsByStudent.get(studentRow.id) ?? [];
                const classAssignmentCount = classIdsForStudent.reduce(
                    (total, classId) =>
                        total + (assignmentsByClass.get(classId)?.length ?? 0),
                    0,
                );

                return {
                    id: studentRow.id,
                    name: studentRow.name,
                    email: studentRow.email ?? null,
                    classCount: classIdsForStudent.length,
                    assignmentCount:
                        directAssignments.length + classAssignmentCount,
                    attemptCount: summary.attemptCount,
                    averageScore: summary.averageScore,
                    lastAttemptAt: summary.lastAttemptAt,
                };
            })
            .sort((left, right) => left.name.localeCompare(right.name));

        return {
            classes: classReports,
            students: studentReports,
            generatedAt: Date.now(),
        };
    },
);

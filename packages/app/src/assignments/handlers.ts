import { Data, Effect } from "effect";
import { and, eq } from "drizzle-orm";
import { createDb } from "~/db/client";
import { quizAssignments } from "~/db/schema";
import type { AssignmentInput, AssignmentFilters, AssignmentStatusUpdate } from "./schemas";

/**
 * Tagged errors for Assignments
 */
export class AssignmentNotFound extends Data.TaggedError("AssignmentNotFound")<{
    id: string;
}> {}

export class AssignmentAlreadyCompleted extends Data.TaggedError(
    "AssignmentAlreadyCompleted",
)<{
    id: string;
}> {}

export class AssignmentNotSubmitted extends Data.TaggedError(
    "AssignmentNotSubmitted",
)<{
    id: string;
}> {}

/**
 * Effect handlers for Assignments API
 */

export function createAssignmentEffect(
    db: ReturnType<typeof createDb>,
    input: { quizId: string; teacherId: string; classId?: string; studentId?: string; dueAt?: number; status?: string },
) {
    return Effect.tryPromise({
        try: async () => {
            const { quizId, teacherId, classId, studentId, dueAt, status } = input;

            const existingRows = await db
                .select()
                .from(quizAssignments)
                .where(eq(quizAssignments.quizId, quizId))
                .limit(1);

            if (existingRows.length > 0) {
                throw new Error("Assignment already exists");
            }

            await db
                .insert(quizAssignments)
                .values({
                    id: input.quizId + "_" + Date.now(),
                    quizId,
                    teacherId,
                    classId: classId ?? null,
                    studentId: studentId ?? null,
                    status: status ?? "active",
                    dueAt: dueAt ?? null,
                    createdAt: Date.now(),
                });

            return {
                id: input.quizId + "_" + Date.now(),
                quizId,
                teacherId,
                classId: classId ?? null,
                studentId: studentId ?? null,
                status: status ?? "active",
                dueAt: dueAt ?? null,
                createdAt: Date.now(),
            };
        },
        catch: () =>
            ({ success: false as const, error: "Failed to create assignment." }),
    });
}

export function listAssignmentsEffect(
    db: ReturnType<typeof createDb>,
    filters: AssignmentFilters & { teacherId: string },
) {
    return Effect.tryPromise({
        try: async () => {
            const conditions: any[] = [eq(quizAssignments.teacherId, filters.teacherId)];

            if (filters.quizId) {
                conditions.push(eq(quizAssignments.quizId, filters.quizId));
            }
            if (filters.status) {
                conditions.push(eq(quizAssignments.status, filters.status));
            }
            if (filters.classId) {
                conditions.push(eq(quizAssignments.classId, filters.classId));
            }
            if (filters.studentId) {
                conditions.push(eq(quizAssignments.studentId, filters.studentId));
            }

            const rows = await db
                .select()
                .from(quizAssignments)
                .where(and(...conditions))
                .orderBy(quizAssignments.createdAt)
                .limit(100);

            return { assignments: rows, total: rows.length };
        },
        catch: () =>
            ({ success: false as const, error: "Failed to list assignments." }),
    });
}

export function getAssignmentEffect(
    db: ReturnType<typeof createDb>,
    input: { id: string },
) {
    return Effect.tryPromise({
        try: async () => {
            const [assignment] = await db
                .select()
                .from(quizAssignments)
                .where(eq(quizAssignments.id, input.id))
                .limit(1);

            if (!assignment) throw new AssignmentNotFound({ id: input.id });

            return assignment;
        },
        catch: () =>
            ({ success: false as const, error: "Failed to get assignment." }),
    });
}

export function updateAssignmentStatusEffect(
    db: ReturnType<typeof createDb>,
    input: AssignmentStatusUpdate & { teacherId: string },
) {
    return Effect.tryPromise({
        try: async () => {
            const [assignment] = await db
                .select()
                .from(quizAssignments)
                .where(
                    and(
                        eq(quizAssignments.id, input.assignmentId),
                        eq(quizAssignments.teacherId, input.teacherId),
                    ),
                )
                .limit(1);

            if (!assignment) throw new AssignmentNotFound({ id: input.assignmentId });

            if (assignment.status === "completed") {
                throw new AssignmentAlreadyCompleted({ id: input.assignmentId });
            }

            await db
                .update(quizAssignments)
                .set({ status: input.status })
                .where(eq(quizAssignments.id, input.assignmentId));

            return { id: input.assignmentId, status: input.status };
        },
        catch: () =>
            ({ success: false as const, error: "Failed to update assignment status." }),
    });
}

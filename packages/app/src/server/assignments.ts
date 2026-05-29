import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { Effect, Exit } from "effect";
import { createDb } from "~/db/client";
import { getAuthenticatedUser } from "~/utils/auth.server";
import {
    createAssignmentEffect,
    listAssignmentsEffect,
    getAssignmentEffect,
    updateAssignmentStatusEffect,
} from "~/assignments/handlers";
import type { AssignmentInput, AssignmentFilters, AssignmentStatusUpdate } from "~/assignments/schemas";

export type Assignment = {
    id: string;
    quizId: string;
    teacherId: string;
    classId: string | null;
    studentId: string | null;
    status: string;
    dueAt: number | null;
    createdAt: number;
};

export const createAssignment = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as AssignmentInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            createAssignmentEffect(createDb(env.DB), {
                quizId: data.quizId,
                teacherId: user.id,
                classId: data.classId,
                studentId: data.studentId,
                dueAt: data.dueAt,
                status: "active",
            }),
        );
        return Exit.match(exit, {
            onSuccess: (assignment) => ({ success: true as const, assignment }),
            onFailure: () => ({ success: false as const, error: "Failed to create assignment." }),
        });
    });

export const listAssignments = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as AssignmentFilters)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in.", assignments: [] as Assignment[], total: 0 };

        const exit = await Effect.runPromiseExit(
            listAssignmentsEffect(createDb(env.DB), {
                ...data,
                teacherId: user.id,
            }),
        );
        return Exit.match(exit, {
            onSuccess: ({ assignments, total }) => ({ success: true as const, assignments, total }),
            onFailure: () => ({ success: false as const, error: "Failed to list assignments.", assignments: [] as Assignment[], total: 0 }),
        });
    });

export const getAssignment = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as { id: string })
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            getAssignmentEffect(createDb(env.DB), { id: data.id }),
        );
        return Exit.match(exit, {
            onSuccess: (assignment) => ({ success: true as const, assignment }),
            onFailure: () => ({ success: false as const, error: "Assignment not found." }),
        });
    });

export const updateAssignmentStatus = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as AssignmentStatusUpdate)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            updateAssignmentStatusEffect(createDb(env.DB), {
                assignmentId: data.assignmentId,
                status: data.status,
                teacherId: user.id,
            }),
        );
        return Exit.match(exit, {
            onSuccess: (result) => ({ success: true as const, ...result }),
            onFailure: () => ({ success: false as const, error: "Failed to update assignment status." }),
        });
    });

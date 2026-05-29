import { createServerFn } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { Effect, Exit } from "effect";
import { createDb } from "~/db/client";
import { getAuthenticatedUser } from "~/utils/auth.server";
import {
    saveQuizEffect,
    createQuizShareLinkEffect,
    getSharedQuizEffect,
    createQuizAssignmentEffect,
    getTeacherAssignmentsEffect,
    getStudentAssignmentsEffect,
    updateQuizAssignmentStatusEffect,
    submitQuizAttemptEffect,
    getStudentAssignmentsWithDetailsEffect,
    getAssignmentQuizForPlayEffect,
} from "~/quiz/handlers";
import type {
    SaveQuizInput,
    ShareLinkInput,
    ShareLinkLookupInput,
    AssignmentInput,
    AssignmentFilters,
    StudentAssignmentsInput,
    AssignmentStatusUpdateInput,
    QuizAttemptInput,
} from "~/quiz/schemas";

export const saveQuiz = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as SaveQuizInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            saveQuizEffect(createDb(env.DB), env.BUCKET, user.id, data),
        );
        return Exit.match(exit, {
            onSuccess: ({ id }) => ({ success: true as const, id }),
            onFailure: () => ({ success: false as const, error: "Failed to save quiz." }),
        });
    });

export const createQuizShareLink = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as ShareLinkInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            createQuizShareLinkEffect(createDb(env.DB), data.quizId, user.id, data.requireToken ?? false),
        );
        return Exit.match(exit, {
            onSuccess: ({ shareId, accessToken }) =>
                ({ success: true as const, shareId, accessToken }) as const,
            onFailure: () => {
                return { success: false as const, error: "Failed to create share link." };
            },
        });
    });

export const getSharedQuiz = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as ShareLinkLookupInput)
    .handler(async ({ data }) => {
        const exit = await Effect.runPromiseExit(
            getSharedQuizEffect(createDb(env.DB), data.shareId, data.token),
        );
        return Exit.match(exit, {
            onSuccess: async (quiz) => {
                const viewer = await getAuthenticatedUser(getRequestHeaders());
                return { success: true as const, quiz: { ...quiz, viewer } };
            },
            onFailure: () => {
                const noToken = !data.token;
                return {
                    success: false as const,
                    error: noToken ? "Access token required." : "Failed to load shared quiz.",
                    requiresToken: noToken ? (true as const) : undefined,
                };
            },
        });
    });

export const createQuizAssignment = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as AssignmentInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            createQuizAssignmentEffect(createDb(env.DB), user.id, data),
        );
        return Exit.match(exit, {
            onSuccess: ({ id }) => ({ success: true as const, id }),
            onFailure: () => ({ success: false as const, error: "Failed to create assignment." }),
        });
    });

export const getTeacherAssignments = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as AssignmentFilters)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in.", assignments: [] };

        const exit = await Effect.runPromiseExit(
            getTeacherAssignmentsEffect(createDb(env.DB), user.id, data),
        );
        return Exit.match(exit, {
            onSuccess: (assignments) => ({ success: true as const, assignments }),
            onFailure: () => ({ success: false as const, error: "Failed to load assignments.", assignments: [] }),
        });
    });

export const getStudentAssignments = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as StudentAssignmentsInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in.", assignments: [] };

        const exit = await Effect.runPromiseExit(
            getStudentAssignmentsEffect(createDb(env.DB), user.id, data),
        );
        return Exit.match(exit, {
            onSuccess: (assignments) => ({ success: true as const, assignments }),
            onFailure: () => ({ success: false as const, error: "Failed to load assignments.", assignments: [] }),
        });
    });

export const updateQuizAssignmentStatus = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as AssignmentStatusUpdateInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            updateQuizAssignmentStatusEffect(createDb(env.DB), user.id, data),
        );
        return Exit.match(exit, {
            onSuccess: (assignment) => ({ success: true as const, assignment }),
            onFailure: () => ({ success: false as const, error: "Failed to update assignment." }),
        });
    });

export const submitQuizAttempt = createServerFn({ method: "POST" })
    .inputValidator((data: unknown) => data as QuizAttemptInput)
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            submitQuizAttemptEffect(createDb(env.DB), user.id, data),
        );
        return Exit.match(exit, {
            onSuccess: ({ attemptId, score, maxScore }) =>
                ({ success: true as const, attemptId, score, maxScore }),
            onFailure: () => ({ success: false as const, error: "Failed to submit quiz attempt." }),
        });
    });

export const getStudentAssignmentsWithDetails = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as { status?: string })
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in.", assignments: [] };

        const exit = await Effect.runPromiseExit(
            getStudentAssignmentsWithDetailsEffect(createDb(env.DB), user.id, data),
        );
        return Exit.match(exit, {
            onSuccess: (assignments) => ({ success: true as const, assignments }),
            onFailure: () => ({ success: false as const, error: "Failed to load assignments.", assignments: [] }),
        });
    });

export const getAssignmentQuizForPlay = createServerFn({ method: "GET" })
    .inputValidator((data: unknown) => data as { assignmentId: string })
    .handler(async ({ data }) => {
        const user = await getAuthenticatedUser(getRequestHeaders());
        if (!user) return { success: false as const, error: "You must be signed in." };

        const exit = await Effect.runPromiseExit(
            getAssignmentQuizForPlayEffect(createDb(env.DB), data.assignmentId, user.id),
        );
        return Exit.match(exit, {
            onSuccess: (quiz) => ({ success: true as const, quiz }),
            onFailure: () => ({ success: false as const, error: "Failed to load quiz." }),
        });
    });

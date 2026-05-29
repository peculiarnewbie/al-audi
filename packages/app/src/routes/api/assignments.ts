import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { env } from "cloudflare:workers";
import { Effect, Exit } from "effect";
import { createDb } from "~/db/client";
import {
    getAuthenticatedUser,
    getAuthenticatedDbUser,
} from "~/utils/auth.server";
import {
    listAssignmentsEffect,
    createAssignmentEffect,
} from "~/assignments/handlers";

function parseAssignmentPayload(payload: unknown): {
    quizId?: string;
    classId?: string;
    studentId?: string;
    dueAt?: number;
} | null {
    if (typeof payload !== "object" || payload === null) return null;
    const obj = payload as Record<string, unknown>;
    if (typeof obj.quizId !== "string" || !obj.quizId.trim()) return null;
    const result: any = { quizId: obj.quizId.trim() };
    if (typeof obj.classId === "string") result.classId = obj.classId.trim();
    if (typeof obj.studentId === "string") result.studentId = obj.studentId.trim();
    if (typeof obj.dueAt === "number") result.dueAt = obj.dueAt;
    return result;
}

export const Route = createFileRoute("/api/assignments")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const user = await getAuthenticatedUser(getRequestHeaders());
                if (!user) {
                    return json({ error: "You must be signed in." }, { status: 401 });
                }

                const url = new URL(request.url);
                const quizId = url.searchParams.get("quizId") ?? undefined;
                const status = url.searchParams.get("status") ?? undefined;
                const classId = url.searchParams.get("classId") ?? undefined;
                const studentId = url.searchParams.get("studentId") ?? undefined;

                const exit = await Effect.runPromiseExit(
                    listAssignmentsEffect(createDb(env.DB), {
                        quizId,
                        status: status as "active" | "completed" | "submitted" | undefined,
                        classId,
                        studentId,
                        teacherId: user.id,
                    }),
                );
                return Exit.match(exit, {
                    onSuccess: (result) => json({ assignments: result.assignments, total: result.total }),
                    onFailure: () => json({ error: "Failed to list assignments." }),
                });
            },
            POST: async ({ request }) => {
                const user = await getAuthenticatedUser(getRequestHeaders());
                const dbUser = await getAuthenticatedDbUser(getRequestHeaders());

                if (!user || !dbUser) {
                    return json({ error: "You must be signed in." }, { status: 401 });
                }

                if (dbUser.role !== "teacher" && dbUser.role !== "admin") {
                    return json({ error: "Only teachers can create assignments." }, { status: 403 });
                }

                let payload: unknown;
                try {
                    payload = await request.json();
                } catch {
                    return json({ error: "Invalid assignment payload." }, { status: 400 });
                }

                const parsed = parseAssignmentPayload(payload);
                if (!parsed || !parsed.quizId) {
                    return json({ error: "Invalid assignment payload." }, { status: 400 });
                }

                const exit = await Effect.runPromiseExit(
                    createAssignmentEffect(createDb(env.DB), {
                        quizId: parsed.quizId,
                        teacherId: user.id,
                        classId: parsed.classId,
                        studentId: parsed.studentId,
                        dueAt: parsed.dueAt,
                    }),
                );
                return Exit.match(exit, {
                    onSuccess: (assignment) => json({ success: true, assignment }),
                    onFailure: () => json({ error: "Failed to create assignment." }),
                });
            },
        },
    },
});

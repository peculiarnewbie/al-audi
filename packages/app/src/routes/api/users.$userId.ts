import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import {
    getAdminUser,
    updateAdminStudentTeacher,
    updateAdminUserRole,
} from "~/server/admin";

type UpdateUserPayload = {
    role?: "none" | "student" | "teacher" | "admin";
    teacherId?: string | null;
};

const validRoles = ["none", "student", "teacher", "admin"] as const;

function parseUpdateUserPayload(payload: unknown): UpdateUserPayload | null {
    if (typeof payload !== "object" || payload === null) return null;

    const obj = payload as Record<string, unknown>;
    const hasRole = "role" in obj;
    const hasTeacher = "teacherId" in obj;

    if ((!hasRole && !hasTeacher) || (hasRole && hasTeacher)) return null;

    if (hasRole) {
        if (!validRoles.includes(obj.role as any)) return null;
    }

    if (hasTeacher) {
        if (obj.teacherId !== null && typeof obj.teacherId !== "string") return null;
        if (typeof obj.teacherId === "string" && !obj.teacherId.trim()) return null;
    }

    return {
        ...(hasRole ? { role: obj.role as UpdateUserPayload["role"] } : {}),
        ...(hasTeacher
            ? { teacherId: obj.teacherId === null ? null : String(obj.teacherId) }
            : {}),
    };
}

export const Route = createFileRoute("/api/users/$userId")({
    server: {
        handlers: {
            GET: async ({ params }) => {
                const result = await getAdminUser(
                    getRequestHeaders(),
                    params.userId,
                );

                if (result.status === "unauthenticated") {
                    return json(
                        { error: "You must be signed in." },
                        { status: 401 },
                    );
                }

                if (result.status === "forbidden") {
                    return json(
                        { error: "Admin access required." },
                        { status: 403 },
                    );
                }

                if (result.status === "not_found") {
                    return json({ error: "User not found." }, { status: 404 });
                }

                return json(result.user);
            },
            PATCH: async ({ params, request }) => {
                let payload: unknown;

                try {
                    payload = await request.json();
                } catch (error) {
                    return json(
                        { error: "Invalid user payload." },
                        { status: 400 },
                    );
                }

                const parsed = parseUpdateUserPayload(payload);

                if (!parsed) {
                    return json(
                        { error: "Invalid user payload." },
                        { status: 400 },
                    );
                }

                const role = parsed.role;
                const teacherId = parsed.teacherId;
                const isTeacherUpdate = typeof teacherId !== "undefined";
                let result: Awaited<ReturnType<typeof updateAdminUserRole>>;

                if (typeof role !== "undefined") {
                    result = await updateAdminUserRole(
                        getRequestHeaders(),
                        params.userId,
                        role,
                    );
                } else {
                    result = await updateAdminStudentTeacher(
                        getRequestHeaders(),
                        params.userId,
                        teacherId ?? null,
                    );
                }

                if (result.status === "unauthenticated") {
                    return json(
                        { error: "You must be signed in." },
                        { status: 401 },
                    );
                }

                if (result.status === "forbidden") {
                    return json(
                        { error: "Admin access required." },
                        { status: 403 },
                    );
                }

                if (result.status === "not_found") {
                    return json(
                        {
                            error: isTeacherUpdate
                                ? "Student or teacher not found."
                                : "User not found.",
                        },
                        { status: 404 },
                    );
                }

                return json(result.user);
            },
        },
    },
});

import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { z } from "zod";
import {
    getAdminUser,
    updateAdminStudentTeacher,
    updateAdminUserRole,
} from "~/server/admin";

const updateUserSchema = z
    .object({
        role: z.enum(["none", "student", "teacher", "admin"]).optional(),
        teacherId: z.string().trim().min(1).nullable().optional(),
    })
    .superRefine((data, ctx) => {
        const hasRole = typeof data.role !== "undefined";
        const hasTeacher = typeof data.teacherId !== "undefined";

        if (!hasRole && !hasTeacher) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid user payload.",
            });
            return;
        }

        if (hasRole && hasTeacher) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid user payload.",
            });
        }
    });

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

                const parsed = updateUserSchema.safeParse(payload);

                if (!parsed.success) {
                    return json(
                        { error: "Invalid user payload." },
                        { status: 400 },
                    );
                }

                const role = parsed.data.role;
                const teacherId = parsed.data.teacherId;
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

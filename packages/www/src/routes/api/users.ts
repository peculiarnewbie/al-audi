import { createFileRoute } from "@tanstack/solid-router";
import { json } from "@tanstack/solid-start";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { getAdminUsers } from "~/server/admin";
import type { UserRole } from "~/server/admin";

export const Route = createFileRoute("/api/users")({
    server: {
        handlers: {
            GET: async ({ request }) => {
                const url = new URL(request.url);
                const search = url.searchParams.get("q")?.trim();
                const roleParam = url.searchParams.get("role")?.trim();
                const roleOptions: UserRole[] = [
                    "none",
                    "student",
                    "teacher",
                    "admin",
                ];
                const role = roleOptions.includes(roleParam as UserRole)
                    ? (roleParam as UserRole)
                    : undefined;

                if (roleParam && !role) {
                    return json(
                        { error: "Invalid role filter." },
                        { status: 400 },
                    );
                }

                const result = await getAdminUsers(
                    getRequestHeaders(),
                    search || undefined,
                    role,
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

                return json(result.users);
            },
        },
    },
});

import { Link, Outlet, createFileRoute } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import type { User } from "../utils/users";

const getUsers = createServerFn({ method: "GET" }).handler(async () => {
    const { getRequestHeaders } = await import("@tanstack/solid-start/server");
    const { getAdminUsers } = await import("~/server/admin");

    const result = await getAdminUsers(getRequestHeaders());

    if (result.status !== "ok") {
        throw new Error("Failed to fetch users");
    }

    return result.users;
});

export const Route = createFileRoute("/users")({
    loader: async () => {
        return getUsers();
    },
    component: UsersComponent,
});

function UsersComponent() {
    const users = Route.useLoaderData();

    return (
        <div class="mx-auto max-w-5xl px-6 py-12 grid gap-6 lg:grid-cols-[240px_1fr]">
            <div class="glass-panel p-4">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500 mb-3">
                    Users
                </div>
                <ul class="space-y-1">
                    {[
                        ...users(),
                        {
                            id: "i-do-not-exist",
                            name: "Non-existent User",
                            email: null,
                            role: "none",
                            createdAt: Date.now(),
                        },
                    ].map((user) => {
                        return (
                            <li class="whitespace-nowrap">
                                <Link
                                    to="/users/$userId"
                                    params={{
                                        userId: String(user.id),
                                    }}
                                    class="block rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-white/70 hover:text-slate-900"
                                    activeProps={{
                                        class: "bg-white/90 text-slate-900 font-semibold",
                                    }}
                                >
                                    <div>{user.name}</div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <div class="glass-panel p-6 min-h-[200px]">
                <Outlet />
            </div>
        </div>
    );
}

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
        <div class="p-2 flex gap-2">
            <ul class="list-disc pl-4">
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
                                class="block py-1 text-blue-800 hover:text-blue-600"
                                activeProps={{ class: "text-black font-bold" }}
                            >
                                <div>{user.name}</div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            <hr />
            <Outlet />
        </div>
    );
}

import { createFileRoute } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { NotFound } from "src/components/NotFound";
import { UserErrorComponent } from "src/components/UserError";
import type { User } from "../utils/users";

const getUser = createServerFn({ method: "GET" })
    .inputValidator((data: { userId: string }) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } =
            await import("@tanstack/solid-start/server");
        const { getAdminUser } = await import("~/server/admin");

        const result = await getAdminUser(getRequestHeaders(), data.userId);

        if (result.status === "not_found") {
            return null;
        }

        if (result.status !== "ok") {
            throw new Error("Failed to fetch user");
        }

        return result.user;
    });

export const Route = createFileRoute("/users/$userId")({
    loader: async ({ params: { userId } }) => {
        const user = await getUser({ data: { userId } });

        if (!user) {
            throw new Error("User not found");
        }

        return user as User;
    },
    errorComponent: UserErrorComponent,
    component: UserComponent,
    notFoundComponent: () => {
        return <NotFound>User not found</NotFound>;
    },
});

function UserComponent() {
    const user = Route.useLoaderData();
    const createdAt = () =>
        new Date(user().createdAt).toISOString().slice(0, 10);

    return (
        <div class="space-y-2">
            <h4 class="text-xl font-bold underline">{user().name}</h4>
            <div class="text-sm">{user().email ?? "No email on file"}</div>
            <div class="text-sm text-stone-600">Role: {user().role}</div>
            <div class="text-sm text-stone-500">Joined {createdAt()}</div>
            <div>
                <a
                    href={`/api/users/${user().id}`}
                    class="text-blue-800 hover:text-blue-600 underline"
                >
                    View as JSON
                </a>
            </div>
        </div>
    );
}

import { createFileRoute } from "@tanstack/solid-router";
import { getRequestHeaders } from "@tanstack/solid-start/server";
import { NotFound } from "src/components/NotFound";
import { UserErrorComponent } from "src/components/UserError";
import { getAdminUser } from "~/server/admin";
import type { User } from "../utils/users";

export const Route = createFileRoute("/users/$userId")({
    loader: async ({ params: { userId } }) => {
        const result = await getAdminUser(getRequestHeaders(), userId);

        if (result.status === "not_found") {
            throw new Error("User not found");
        }

        if (result.status !== "ok") {
            throw new Error("Failed to fetch user");
        }

        return result.user as User;
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

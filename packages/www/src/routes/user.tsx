import { createFileRoute, redirect } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import type { AuthUser } from "~/utils/workos-auth.server";

const getUser = createServerFn({ method: "GET" }).handler(
    async (): Promise<AuthUser | null> => {
        const { getAuthenticatedUser } =
            await import("~/utils/workos-auth.server");
        const { getRequestHeaders } =
            await import("@tanstack/solid-start/server");
        const headers = getRequestHeaders();
        return getAuthenticatedUser(headers);
    },
);

export const Route = createFileRoute("/user")({
    loader: async () => {
        const user = await getUser();

        if (!user) {
            throw redirect({ href: "/api/auth/sign-in" });
        }

        return user;
    },
    component: UserPage,
});

function UserPage() {
    const user = Route.useLoaderData();
    const fullName = () =>
        [user().firstName, user().lastName].filter(Boolean).join(" ");

    return (
        <div class="max-w-2xl mx-auto px-6 py-12">
            <h1 class="text-2xl font-semibold text-stone-800 mb-6">
                Your Profile
            </h1>
            <div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
                <div>
                    <div class="text-xs uppercase tracking-wide text-stone-500">
                        Name
                    </div>
                    <div class="text-lg text-stone-800">
                        {fullName() || "WorkOS User"}
                    </div>
                </div>
                <div>
                    <div class="text-xs uppercase tracking-wide text-stone-500">
                        Email
                    </div>
                    <div class="text-lg text-stone-800">{user().email}</div>
                </div>
            </div>
        </div>
    );
}

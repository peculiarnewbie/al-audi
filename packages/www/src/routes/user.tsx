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
        <div class="mx-auto max-w-3xl px-6 py-12">
            <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)] mb-6">
                Your Profile
            </h1>
            <div class="glass-panel p-6 space-y-4">
                <div>
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Name
                    </div>
                    <div class="text-lg text-[color:var(--dashboard-ink)]">
                        {fullName() || "WorkOS User"}
                    </div>
                </div>
                <div>
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Email
                    </div>
                    <div class="text-lg text-[color:var(--dashboard-ink)]">
                        {user().email}
                    </div>
                </div>
            </div>
        </div>
    );
}

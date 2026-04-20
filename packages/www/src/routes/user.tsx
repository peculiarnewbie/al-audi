import { createFileRoute, redirect } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { Show } from "solid-js";
import type { AuthUser, DbUser } from "~/utils/auth.server";

const getUser = createServerFn({ method: "GET" }).handler(
    async (): Promise<{ authUser: AuthUser; dbUser: DbUser | null } | null> => {
        const { getAuthenticatedDbUser, getAuthenticatedUser } =
            await import("~/utils/auth.server");
        const { getRequestHeaders } =
            await import("@tanstack/solid-start/server");
        const headers = getRequestHeaders();
        const authUser = await getAuthenticatedUser(headers);

        if (!authUser) {
            return null;
        }

        return {
            authUser,
            dbUser: await getAuthenticatedDbUser(headers),
        };
    },
);

export const Route = createFileRoute("/user")({
    loader: async () => {
        const user = await getUser();

        if (!user) {
            throw redirect({ href: "/sign-in?next=/user" });
        }

        return user;
    },
    component: UserPage,
});

function UserPage() {
    const user = Route.useLoaderData();
    const authUser = () => user().authUser;
    const dbUser = () => user().dbUser;

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
                        {authUser().name}
                    </div>
                </div>
                <div>
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Email
                    </div>
                    <div class="text-lg text-[color:var(--dashboard-ink)]">
                        {authUser().email}
                    </div>
                </div>
                <Show when={dbUser()}>
                    <div>
                        <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                            Access role
                        </div>
                        <div class="text-lg text-[color:var(--dashboard-ink)]">
                            {dbUser()!.role}
                        </div>
                    </div>
                </Show>
                <div>
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Email status
                    </div>
                    <div class="text-lg text-[color:var(--dashboard-ink)]">
                        {authUser().emailVerified ? "Verified" : "Unverified"}
                    </div>
                </div>
            </div>
        </div>
    );
}

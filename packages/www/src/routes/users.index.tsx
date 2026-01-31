import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/users/")({
    component: UsersIndexComponent,
});

function UsersIndexComponent() {
    return (
        <div class="text-sm text-slate-600">
            Select a user or{" "}
            <a href="/api/users" class="text-slate-900 underline">
                view as JSON
            </a>
        </div>
    );
}

import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/_pathlessLayout/_nested-layout/route-a")(
    {
        component: LayoutAComponent,
    },
);

function LayoutAComponent() {
    return <div class="text-sm text-slate-600">I'm A!</div>;
}

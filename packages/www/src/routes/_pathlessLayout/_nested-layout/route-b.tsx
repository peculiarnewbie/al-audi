import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/_pathlessLayout/_nested-layout/route-b")(
    {
        component: LayoutBComponent,
    },
);

function LayoutBComponent() {
    return <div class="text-sm text-slate-600">I'm B!</div>;
}

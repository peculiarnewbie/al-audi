import { Link, Outlet, createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/_pathlessLayout/_nested-layout")({
    component: LayoutComponent,
});

function LayoutComponent() {
    return (
        <div class="space-y-4">
            <div class="text-sm text-slate-600">I'm a nested layout</div>
            <div class="flex gap-2 border-b border-white/70 pb-2 text-sm">
                <Link
                    to="/route-a"
                    activeProps={{
                        class: "text-slate-900 font-semibold",
                    }}
                    class="text-slate-600 hover:text-slate-900"
                >
                    Go to route A
                </Link>
                <Link
                    to="/route-b"
                    activeProps={{
                        class: "text-slate-900 font-semibold",
                    }}
                    class="text-slate-600 hover:text-slate-900"
                >
                    Go to route B
                </Link>
            </div>
            <div>
                <Outlet />
            </div>
        </div>
    );
}

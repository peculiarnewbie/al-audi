import { Outlet, createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/_pathlessLayout")({
    component: LayoutComponent,
});

function LayoutComponent() {
    return (
        <div class="mx-auto max-w-4xl px-6 py-12">
            <div class="glass-panel p-6 space-y-4">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Pathless layout
                </div>
                <div class="text-sm text-slate-600">I'm a layout</div>
                <div>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

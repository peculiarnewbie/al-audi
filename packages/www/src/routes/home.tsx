import { createFileRoute } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/home")({
    loader: () => getData(),
    component: Home,
});

const getData = createServerFn().handler(() => {
    return {
        message: `Running in ${typeof navigator !== "undefined" ? navigator.userAgent : "server"}`,
        myVar: env.MY_VAR,
    };
});

function Home() {
    const data = Route.useLoaderData();

    return (
        <div class="mx-auto max-w-3xl px-6 py-12">
            <div class="glass-panel p-6 space-y-3">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Environment
                </div>
                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                    Welcome Home
                </h1>
                <p class="text-slate-600">{data()?.message}</p>
                <p class="text-slate-600">{data()?.myVar}</p>
            </div>
        </div>
    );
}

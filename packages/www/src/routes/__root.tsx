/// <reference types="vite/client" />
import {
    HeadContent,
    Link,
    Scripts,
    createRootRoute,
} from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools";
import { Show } from "solid-js";
import { HydrationScript } from "solid-js/web";
import type * as Solid from "solid-js";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import appCss from "~/styles/app.css?url";
import { seo } from "~/utils/seo";

const getUser = createServerFn({ method: "GET" }).handler(async () => {
    const { getAuthenticatedUser } = await import("~/utils/workos-auth.server");
    const { getRequestHeaders } = await import("@tanstack/solid-start/server");

    return getAuthenticatedUser(getRequestHeaders());
});

export const Route = createRootRoute({
    loader: async () => {
        const user = await getUser();
        return { user };
    },
    head: () => ({
        meta: [
            {
                charset: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            ...seo({
                title: "TanStack Start | Type-Safe, Client-First, Full-Stack React Framework",
                description: `TanStack Start is a type-safe, client-first, full-stack React framework. `,
            }),
        ],
        links: [
            { rel: "stylesheet", href: appCss },
            {
                rel: "stylesheet",
                href: "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap",
            },
            {
                rel: "apple-touch-icon",
                sizes: "180x180",
                href: "/apple-touch-icon.png",
            },
            {
                rel: "icon",
                type: "image/png",
                sizes: "32x32",
                href: "/favicon-32x32.png",
            },
            {
                rel: "icon",
                type: "image/png",
                sizes: "16x16",
                href: "/favicon-16x16.png",
            },
            { rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
            { rel: "icon", href: "/favicon.ico" },
        ],
        scripts: [
            {
                src: "/customScript.js",
                type: "text/javascript",
            },
        ],
    }),
    errorComponent: DefaultCatchBoundary,
    notFoundComponent: () => <NotFound />,
    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: Solid.JSX.Element }) {
    const auth = Route.useLoaderData();
    const user = () => auth()?.user;

    return (
        <html>
            <head>
                <HydrationScript />
            </head>
            <body>
                <HeadContent />
                <div
                    class="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,_#f7f3eb_0%,_#eef6f3_55%,_#f7f8fb_100%)] text-slate-900"
                    style={{
                        "--dashboard-accent": "#0f766e",
                        "--dashboard-accent-strong": "#115e59",
                        "--dashboard-accent-soft": "#ccfbf1",
                        "--dashboard-ink": "#1f2937",
                        "--dashboard-wash": "#f8fafc",
                        "font-family": "'Space Grotesk', system-ui, sans-serif",
                    }}
                >
                    <div class="pointer-events-none absolute -top-40 left-[-10%] h-72 w-72 rounded-full bg-[color:var(--dashboard-accent-soft)] opacity-80 blur-3xl" />
                    <div class="pointer-events-none absolute bottom-[-25%] right-[-10%] h-80 w-80 rounded-full bg-amber-200/60 blur-3xl" />

                    <header class="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pt-6">
                        <div class="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                            <Link
                                to="/"
                                activeProps={{
                                    class: "text-slate-900",
                                }}
                                activeOptions={{ exact: true }}
                                class="transition hover:text-slate-900"
                            >
                                Home
                            </Link>
                            <span class="text-slate-300">•</span>
                            <Link
                                to="/dashboard"
                                activeProps={{
                                    class: "text-slate-900",
                                }}
                                class="transition hover:text-slate-900"
                            >
                                Dashboard
                            </Link>
                            <span class="text-slate-300">•</span>
                            <Link
                                to="/reports"
                                activeProps={{
                                    class: "text-slate-900",
                                }}
                                class="transition hover:text-slate-900"
                            >
                                Reports
                            </Link>
                        </div>
                        <div class="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <Show
                                when={user()}
                                fallback={
                                    <a
                                        href="/api/auth/sign-in"
                                        class="rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm transition hover:bg-white"
                                    >
                                        Sign in
                                    </a>
                                }
                            >
                                <Link
                                    to="/user"
                                    class="rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm transition hover:bg-white"
                                >
                                    Account
                                </Link>
                                <a
                                    href="/api/auth/sign-out"
                                    class="rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm transition hover:bg-white"
                                >
                                    Sign out
                                </a>
                            </Show>
                        </div>
                    </header>

                    <main class="relative z-10">{children}</main>
                </div>
                <TanStackRouterDevtools position="bottom-right" />
                <Scripts />
            </body>
        </html>
    );
}

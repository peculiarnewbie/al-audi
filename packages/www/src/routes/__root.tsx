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
                <header class="flex items-center justify-between px-6 py-4">
                    <div class="flex gap-4 text-lg">
                        <Link
                            to="/"
                            activeProps={{
                                class: "font-bold",
                            }}
                            activeOptions={{ exact: true }}
                        >
                            Home
                        </Link>
                        <Link
                            to="/reports"
                            activeProps={{
                                class: "font-bold",
                            }}
                        >
                            Reports
                        </Link>
                    </div>
                    <div class="flex items-center gap-4 text-sm">
                        <Show
                            when={user()}
                            fallback={
                                <a
                                    href="/api/auth/sign-in"
                                    class="text-stone-700 hover:text-stone-900"
                                >
                                    Sign in
                                </a>
                            }
                        >
                            <Link
                                to="/user"
                                class="text-stone-700 hover:text-stone-900"
                            >
                                Account
                            </Link>
                            <a
                                href="/api/auth/sign-out"
                                class="text-stone-700 hover:text-stone-900"
                            >
                                Sign out
                            </a>
                        </Show>
                    </div>
                </header>
                <hr />
                {children}
                <TanStackRouterDevtools position="bottom-right" />
                <Scripts />
            </body>
        </html>
    );
}

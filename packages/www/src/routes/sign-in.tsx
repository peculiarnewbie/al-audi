import { Link, createFileRoute, redirect } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { Show, createSignal } from "solid-js";
import { authClient } from "~/utils/auth-client";

const getUser = createServerFn({ method: "GET" }).handler(async () => {
    const { getAuthenticatedDbUser } = await import("~/utils/auth.server");
    const { getRequestHeaders } = await import("@tanstack/solid-start/server");

    return getAuthenticatedDbUser(getRequestHeaders());
});

const getSafeNext = (next?: string) =>
    next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/dashboard";

export const Route = createFileRoute("/sign-in")({
    validateSearch: (search: Record<string, unknown>) => ({
        next: typeof search.next === "string" ? search.next : undefined,
    }),
    loaderDeps: ({ search }) => ({ next: search.next }),
    loader: async ({ deps }) => {
        const user = await getUser();

        if (user) {
            throw redirect({ href: getSafeNext(deps.next) });
        }

        return { next: getSafeNext(deps.next) };
    },
    component: SignInPage,
});

function SignInPage() {
    const data = Route.useLoaderData();
    const [email, setEmail] = createSignal("");
    const [password, setPassword] = createSignal("");
    const [submitting, setSubmitting] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const [showEmailForm, setShowEmailForm] = createSignal(false);

    const submit = async (event: Event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            const result = await authClient.signIn.email({
                email: email().trim(),
                password: password(),
            });

            if (result.error) {
                setError(result.error.message || "Unable to sign in.");
                return;
            }

            window.location.assign(data().next);
        } finally {
            setSubmitting(false);
        }
    };

    const signInWithGoogle = async () => {
        setError(null);
        const result = await authClient.signIn.social({
            provider: "google",
            callbackURL: data().next,
        });

        if (result.error) {
            setError(result.error.message || "Unable to sign in with Google.");
        }
    };

    return (
        <div class="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
            <section class="glass-panel flex flex-col justify-between overflow-hidden p-8">
                <div class="space-y-4">
                    <div class="text-xs uppercase tracking-[0.35em] text-slate-500">
                        School access
                    </div>
                    <h1 class="font-display text-4xl font-semibold text-[color:var(--dashboard-ink)]">
                        Sign in to your workspace.
                    </h1>
                    <p class="max-w-xl text-sm leading-7 text-slate-600">
                        Use your Google account for quick access, or sign in with a password you control.
                    </p>
                </div>
                <div class="mt-10 grid gap-4 md:grid-cols-2">
                    <div class="rounded-3xl border border-white/70 bg-white/70 p-5">
                        <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                            Existing users
                        </div>
                        <p class="mt-3 text-sm leading-6 text-slate-600">
                            If you used WorkOS before, sign up once with the
                            same email to claim the same role and school data.
                        </p>
                    </div>
                    <div class="rounded-3xl border border-white/70 bg-white/70 p-5">
                        <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                            Admin bootstrap
                        </div>
                        <p class="mt-3 text-sm leading-6 text-slate-600">
                            The first account becomes admin automatically, or
                            you can pre-assign admins with
                            `BETTER_AUTH_ADMIN_EMAILS`.
                        </p>
                    </div>
                </div>
            </section>

            <section class="glass-panel p-8">
                <div class="space-y-2">
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Sign in
                    </div>
                    <h2 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                        Continue to your workspace
                    </h2>
                </div>

                <div class="mt-8 space-y-4">
                    <button
                        type="button"
                        onClick={() => void signInWithGoogle()}
                        class="flex w-full items-center justify-center gap-3 rounded-full border border-white/70 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                    >
                        <svg class="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    <div class="flex items-center gap-4">
                        <div class="h-px flex-1 bg-white/70" />
                        <span class="text-xs uppercase tracking-[0.2em] text-slate-400">or</span>
                        <div class="h-px flex-1 bg-white/70" />
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowEmailForm(!showEmailForm())}
                        class="w-full rounded-full border border-white/70 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-white"
                    >
                        {showEmailForm() ? "Hide email sign in" : "Sign in with email"}
                    </button>

                    <Show when={showEmailForm()}>
                        <form class="space-y-4 pt-2" onSubmit={submit}>
                            <label class="block space-y-2">
                                <span class="text-xs uppercase tracking-[0.25em] text-slate-500">
                                    Email
                                </span>
                                <input
                                    class="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm"
                                    type="email"
                                    autocomplete="email"
                                    value={email()}
                                    onInput={(event) =>
                                        setEmail(event.currentTarget.value)
                                    }
                                    required
                                />
                            </label>
                            <label class="block space-y-2">
                                <span class="text-xs uppercase tracking-[0.25em] text-slate-500">
                                    Password
                                </span>
                                <input
                                    class="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 shadow-sm"
                                    type="password"
                                    autocomplete="current-password"
                                    value={password()}
                                    onInput={(event) =>
                                        setPassword(event.currentTarget.value)
                                    }
                                    required
                                />
                            </label>

                            {error() ? (
                                <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                    {error()}
                                </div>
                            ) : null}

                            <button
                                class="w-full rounded-full bg-[color:var(--dashboard-accent)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                                type="submit"
                                disabled={submitting()}
                            >
                                {submitting() ? "Signing in..." : "Sign in"}
                            </button>
                        </form>
                    </Show>
                </div>

                <div class="mt-6 text-sm text-slate-600">
                    Need an account?{" "}
                    <Link
                        to="/sign-up"
                        search={{ next: data().next }}
                        class="font-semibold text-[color:var(--dashboard-accent-strong)] underline"
                    >
                        Create one
                    </Link>
                </div>
            </section>
        </div>
    );
}

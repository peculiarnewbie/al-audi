import { Link, createFileRoute, redirect } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { For, Show, createResource, createSignal } from "solid-js";
import type { QuizListItem } from "~/server/quizzes";
import { listQuizzes, listQuizCategories } from "~/server/quizzes";

const getUser = createServerFn({ method: "GET" }).handler(
    async () => {
        const { getAuthenticatedUser } = await import("~/utils/auth.server");
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        return getAuthenticatedUser(getRequestHeaders());
    },
);

type CategoryOption = {
    id: string;
    name: string;
    categoryType: string;
};

export const Route = createFileRoute("/quizzes/")({
    loader: async () => {
        const user = await getUser();
        if (!user) {
            throw redirect({ href: "/sign-in?next=/quizzes" });
        }
        return user;
    },
    component: QuizListPage,
});

const formatDate = (value: number) =>
    new Date(value).toISOString().slice(0, 10);

function QuizListPage() {
    const user = Route.useLoaderData();
    const [searchInput, setSearchInput] = createSignal("");
    const [searchTerm, setSearchTerm] = createSignal("");
    const [selectedCategoryId, setSelectedCategoryId] = createSignal<
        string | undefined
    >();

    const [categories] = createResource(async (): Promise<CategoryOption[]> => {
        return listQuizCategories();
    });

    const [quizData, { refetch }] = createResource(
        () => ({ search: searchTerm(), categoryId: selectedCategoryId() }),
        async (query): Promise<QuizListItem[]> => {
            const result = await listQuizzes({
                data: {
                    search: query.search || undefined,
                    categoryId: query.categoryId || undefined,
                },
            });
            if (result.status !== "ok") return [];
            return result.quizzes;
        },
    );

    const handleSearch = (event: Event) => {
        event.preventDefault();
        setSearchTerm(searchInput().trim());
    };

    const clearFilters = () => {
        setSearchInput("");
        setSearchTerm("");
        setSelectedCategoryId(undefined);
    };

    const quizzes = () => quizData() ?? [];
    const allCategories = () => categories() ?? [];
    const hasActiveFilters = () => searchTerm() || selectedCategoryId();

    return (
        <div class="mx-auto max-w-5xl space-y-8 px-6 py-12">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <a
                        href="/dashboard"
                        class="text-xs uppercase tracking-[0.3em] text-slate-500 hover:text-slate-700"
                    >
                        &larr; Back to dashboard
                    </a>
                    <h1 class="mt-4 font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                        My quizzes
                    </h1>
                    <p class="mt-2 text-sm text-slate-600">
                        Browse, search, and manage your quizzes.
                    </p>
                </div>
                <Link
                    to="/quizzes/new"
                    class="rounded-full bg-[color:var(--dashboard-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                >
                    Create quiz
                </Link>
            </div>

            <div class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur">
                <form class="flex flex-wrap gap-3" onSubmit={handleSearch}>
                    <input
                        class="w-full sm:w-72 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700"
                        type="text"
                        placeholder="Search by title..."
                        value={searchInput()}
                        onInput={(e) => setSearchInput(e.currentTarget.value)}
                    />
                    <button
                        type="submit"
                        class="rounded-full bg-[color:var(--dashboard-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                    >
                        Search
                    </button>
                    <Show when={hasActiveFilters()}>
                        <button
                            type="button"
                            onClick={clearFilters}
                            class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-white"
                        >
                            Clear
                        </button>
                    </Show>
                </form>

                <Show when={allCategories().length > 0}>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                                !selectedCategoryId()
                                    ? "bg-[color:var(--dashboard-accent)] text-white shadow-sm"
                                    : "border border-white/70 bg-white/80 text-slate-600 hover:bg-white"
                            }`}
                            onClick={() => setSelectedCategoryId(undefined)}
                        >
                            All
                        </button>
                        <For each={allCategories()}>
                            {(cat) => (
                                <button
                                    type="button"
                                    class={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                                        selectedCategoryId() === cat.id
                                            ? "bg-[color:var(--dashboard-accent)] text-white shadow-sm"
                                            : "border border-white/70 bg-white/80 text-slate-600 hover:bg-white"
                                    }`}
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                >
                                    {cat.name}
                                </button>
                            )}
                        </For>
                    </div>
                </Show>

                <div class="mt-6">
                    <div class="flex items-center justify-between">
                        <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                            {quizzes().length} quiz{quizzes().length !== 1 ? "zes" : ""}
                        </div>
                    </div>

                    <Show
                        when={!quizData.loading}
                        fallback={
                            <div class="mt-6 text-sm text-slate-500">
                                Loading quizzes...
                            </div>
                        }
                    >
                        <Show
                            when={quizzes().length > 0}
                            fallback={
                                <div class="mt-6 rounded-2xl border border-dashed border-white/70 bg-white/50 p-8 text-center">
                                    <div class="text-sm text-slate-500">
                                        {hasActiveFilters()
                                            ? "No quizzes match your filters."
                                            : "You have not created any quizzes yet."}
                                    </div>
                                    <Show when={!hasActiveFilters()}>
                                        <Link
                                            to="/quizzes/new"
                                            class="mt-4 inline-block rounded-full bg-[color:var(--dashboard-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                                        >
                                            Create your first quiz
                                        </Link>
                                    </Show>
                                </div>
                            }
                        >
                            <div class="mt-4 divide-y divide-white/70">
                                <For each={quizzes()}>
                                    {(quiz) => (
                                        <div class="flex flex-wrap items-center justify-between gap-4 py-4">
                                            <div class="min-w-0 flex-1 space-y-1">
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <div class="truncate text-base font-semibold text-[color:var(--dashboard-ink)]">
                                                        {quiz.name ?? "Untitled quiz"}
                                                    </div>
                                                    <span class="rounded-full bg-[color:var(--dashboard-accent-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--dashboard-accent-strong)]">
                                                        {quiz.questionCount}{" "}
                                                        {quiz.questionCount === 1 ? "question" : "questions"}
                                                    </span>
                                                </div>
                                                <div class="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                    <span>Created {formatDate(quiz.createdAt)}</span>
                                                    <For each={quiz.categories}>
                                                        {(cat) => (
                                                            <span class="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
                                                                {cat}
                                                            </span>
                                                        )}
                                                    </For>
                                                </div>
                                            </div>
                                            <div class="flex flex-wrap items-center gap-2">
                                                <Link
                                                    to="/quizzes/new"
                                                    class="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-white"
                                                >
                                                    Edit
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </Show>
                </div>
            </div>
        </div>
    );
}

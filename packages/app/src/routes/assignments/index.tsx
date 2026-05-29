import { Link, createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show, createResource } from "solid-js";
import { getStudentAssignmentsWithDetails } from "~/server/quiz";

export const Route = createFileRoute("/assignments/")({
    component: AssignmentsPage,
});

function AssignmentsPage() {
    const [statusFilter, setStatusFilter] = createSignal<string | undefined>(undefined);

    const [assignmentsData] = createResource(
        () => ({ status: statusFilter() }),
        async (query) => {
            const result = await getStudentAssignmentsWithDetails({
                data: { status: query.status },
            });
            if (!result.success) return [];
            return result.assignments;
        },
    );

    const formatDate = (ts: number | null) => {
        if (!ts) return "No due date";
        return new Date(ts).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const isOverdue = (dueAt: number | null, status: string) => {
        if (!dueAt || status === "completed") return false;
        return dueAt < Date.now();
    };

    const filters = [
        { label: "All", value: undefined },
        { label: "Pending", value: "assigned" },
        { label: "Completed", value: "completed" },
    ];

    return (
        <div class="mx-auto max-w-4xl px-6 py-12 space-y-8">
            <header class="space-y-2">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Assignments
                </div>
                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                    My assignments
                </h1>
                <p class="text-sm text-slate-600">
                    Complete your assigned quizzes before the due date.
                </p>
            </header>

            <div class="flex flex-wrap items-center gap-2">
                <For each={filters}>
                    {(f) => (
                        <button
                            type="button"
                            onClick={() => setStatusFilter(f.value)}
                            class={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                                statusFilter() === f.value
                                    ? "bg-[color:var(--dashboard-accent)] text-white"
                                    : "border border-white/70 bg-white/80 text-slate-600 hover:bg-white"
                            }`}
                        >
                            {f.label}
                        </button>
                    )}
                </For>
            </div>

            <Show when={assignmentsData()}>
                {(data) => (
                    <Show
                        when={data().length}
                        fallback={
                            <div class="rounded-3xl border border-white/70 bg-white/80 p-6 text-sm text-slate-600 shadow-sm">
                                No assignments found.
                            </div>
                        }
                    >
                        <div class="space-y-4">
                            <For each={data()}>
                                {(item) => (
                                    <Link
                                        to="/assignments/$assignmentId"
                                        params={{ assignmentId: item.id }}
                                        class="block rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:shadow-md"
                                    >
                                        <div class="flex flex-wrap items-start justify-between gap-4">
                                            <div class="flex-1 space-y-2 min-w-0">
                                                <div class="flex items-center gap-3">
                                                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                                        {item.quizName}
                                                    </div>
                                                    <span
                                                        class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                                                            item.status === "completed"
                                                                ? "bg-emerald-100 text-emerald-700"
                                                                : isOverdue(item.dueAt, item.status)
                                                                  ? "bg-rose-100 text-rose-700"
                                                                  : "bg-amber-100 text-amber-700"
                                                        }`}
                                                    >
                                                        {item.status === "completed"
                                                            ? "Completed"
                                                            : isOverdue(item.dueAt, item.status)
                                                              ? "Overdue"
                                                              : "Pending"}
                                                    </span>
                                                </div>
                                                <div class="text-sm text-slate-600">
                                                    Assigned by {item.teacherName}
                                                </div>
                                            </div>
                                            <div class="text-right text-xs text-slate-400 shrink-0">
                                                <div>{formatDate(item.dueAt)}</div>
                                                <Show when={item.attempt}>
                                                    <div class="mt-1 text-emerald-600 font-semibold">
                                                        Score: {item.attempt!.score}/{item.attempt!.maxScore}
                                                    </div>
                                                </Show>
                                            </div>
                                        </div>
                                    </Link>
                                )}
                            </For>
                        </div>
                    </Show>
                )}
            </Show>
        </div>
    );
}

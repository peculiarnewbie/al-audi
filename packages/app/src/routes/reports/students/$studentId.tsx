import { createFileRoute, redirect } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { getStudentHistory } from "~/server/reporting";

export const Route = createFileRoute("/reports/students/$studentId")({
    loader: async ({ params }) => {
        const data = await getStudentHistory({ data: { studentId: params.studentId } });
        if (!data) throw redirect({ href: "/sign-in?next=/reports" });
        return data;
    },
    component: StudentHistoryPage,
});

function formatDate(value: number | null) {
    return value ? new Date(value).toISOString().slice(0, 10) : "-";
}

function formatPercent(value: number | null) {
    return value === null ? "-" : String(value) + "%";
}

function formatDuration(ms: number | null) {
    if (!ms) return "-";
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? String(m) + "m " + String(sec) + "s" : String(sec) + "s";
}

function StudentHistoryPage() {
    const data = Route.useLoaderData();

    return (
        <div class="mx-auto max-w-6xl px-6 py-12 space-y-8">
            <header class="space-y-2">
                <a href="/reports" class="text-xs uppercase tracking-[0.3em] text-slate-500 hover:text-slate-700">
                    &larr; Back to reports
                </a>
                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                    {data().studentName}
                </h1>
                <Show when={data().studentEmail}>
                    <p class="text-sm text-slate-600">{data().studentEmail}</p>
                </Show>
                <div class="flex gap-6 text-sm text-slate-600">
                    <span>{String(data().classCount)} class(es)</span>
                    <span>{String(data().totalAttempts)} attempt(s)</span>
                    <span>Avg: {formatPercent(data().averageScore)}</span>
                </div>
            </header>

            <Show
                when={data().items.length}
                fallback={
                    <div class="glass-panel p-6">
                        <div class="text-sm text-slate-600">No quiz attempts yet.</div>
                    </div>
                }
            >
                <div class="space-y-3">
                    <For each={data().items}>
                        {(item) => (
                            <a
                                href={"/reports/attempts/" + item.attemptId}
                                class="glass-card p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                            >
                                <div class="space-y-1">
                                    <div class="font-semibold text-[color:var(--dashboard-ink)]">{item.quizName}</div>
                                    <div class="flex gap-4 text-xs text-slate-500">
                                        <span class="uppercase tracking-[0.2em]">{item.mode}</span>
                                        <span>{formatDate(item.completedAt)}</span>
                                        <span>{formatDuration(item.durationMs)}</span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-lg font-semibold text-[color:var(--dashboard-ink)]">
                                        {formatPercent(
                                            item.score != null && item.maxScore != null && item.maxScore > 0
                                                ? Math.round((item.score / item.maxScore) * 100)
                                                : null,
                                        )}
                                    </div>
                                    <div class="text-xs text-slate-500">
                                        {String(item.score ?? "-")} / {String(item.maxScore ?? "-")}
                                    </div>
                                </div>
                            </a>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
}

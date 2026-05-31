import { createFileRoute } from "@tanstack/solid-router";
import { For, Show, createResource } from "solid-js";
import { getLiveSessions } from "~/server/reporting";

export const Route = createFileRoute("/reports/live")({
    component: LiveSessionsPage,
});

function formatDate(value: number | null) {
    return value
        ? new Date(value).toISOString().slice(0, 10) + " " + new Date(value).toISOString().slice(11, 16)
        : "-";
}

function formatPercent(value: number | null) {
    return value === null ? "-" : String(value) + "%";
}

function LiveSessionsPage() {
    const [sessions] = createResource(async () => getLiveSessions());

    return (
        <div class="mx-auto max-w-6xl px-6 py-12 space-y-8">
            <header class="space-y-2">
                <a href="/reports" class="text-xs uppercase tracking-[0.3em] text-slate-500 hover:text-slate-700">
                    &larr; Back to reports
                </a>
                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                    Live session results
                </h1>
                <p class="text-slate-600">Review results from live quiz sessions.</p>
            </header>

            <Show
                when={sessions()?.length}
                fallback={
                    <div class="glass-panel p-6">
                        <div class="text-sm text-slate-600">No live sessions yet.</div>
                    </div>
                }
            >
                <div class="space-y-3">
                    <For each={sessions()}>
                        {(session) => {
                            const totalPct = session.results.reduce(
                                (s, r) => s + (r.maxScore > 0 ? (r.score / r.maxScore) * 100 : 0),
                                0,
                            );
                            const avgScore = Math.round(totalPct / Math.max(session.results.length, 1));

                            return (
                                <div class="glass-card p-5 space-y-3">
                                    <div class="flex items-start justify-between">
                                        <div>
                                            <div class="font-semibold text-[color:var(--dashboard-ink)]">
                                                Room: {session.roomId}
                                            </div>
                                            <div class="flex gap-4 text-xs text-slate-500 mt-1">
                                                <span>{String(session.playerCount)} player(s)</span>
                                                <span>{formatDate(session.startedAt)}</span>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <div class="text-lg font-semibold text-[color:var(--dashboard-ink)]">
                                                {formatPercent(avgScore)}
                                            </div>
                                            <div class="text-xs text-slate-500">avg score</div>
                                        </div>
                                    </div>

                                    <div class="overflow-x-auto">
                                        <table class="w-full text-sm">
                                            <thead>
                                                <tr class="text-xs uppercase tracking-[0.2em] text-slate-500">
                                                    <th class="text-left py-1 pr-4">Player</th>
                                                    <th class="text-right py-1 px-4">Score</th>
                                                    <th class="text-right py-1 px-4">Max</th>
                                                    <th class="text-right py-1 pl-4">%</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <For each={session.results}>
                                                    {(result) => (
                                                        <tr class="border-t border-slate-200/50">
                                                            <td class="py-2 pr-4 text-[color:var(--dashboard-ink)]">
                                                                {result.playerName}
                                                            </td>
                                                            <td class="py-2 px-4 text-right">{String(result.score)}</td>
                                                            <td class="py-2 px-4 text-right">{String(result.maxScore)}</td>
                                                            <td class="py-2 pl-4 text-right font-medium">
                                                                {result.maxScore > 0
                                                                    ? String(Math.round((result.score / result.maxScore) * 100)) + "%"
                                                                    : "-"}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </For>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </Show>
        </div>
    );
}

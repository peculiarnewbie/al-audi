import { createFileRoute, redirect } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { getAttemptDetail } from "~/server/reporting";
import type { AttemptResponse } from "~/server/reporting";

export const Route = createFileRoute("/reports/attempts/$attemptId")({
    loader: async ({ params }) => {
        const data = await getAttemptDetail({ data: { attemptId: params.attemptId } });
        if (!data) throw redirect({ href: "/sign-in?next=/reports" });
        return data;
    },
    component: AttemptDetailPage,
});

function formatDate(value: number | null) {
    return value
        ? new Date(value).toISOString().slice(0, 10) + " " + new Date(value).toISOString().slice(11, 16)
        : "-";
}

function formatDuration(ms: number | null) {
    if (!ms) return "-";
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? String(m) + "m " + String(sec) + "s" : String(sec) + "s";
}

function optionLabel(idx: number) {
    return String.fromCharCode(65 + idx);
}

function ResponseCard(props: { response: AttemptResponse; index: number }) {
    const r = props.response;
    const isCorrect = r.isCorrect === 1;
    const isWrong = r.isCorrect === 0;

    let borderColor = "border-slate-300";
    if (isCorrect) borderColor = "border-green-400";
    if (isWrong) borderColor = "border-red-400";

    let badgeText = "Not scored";
    let badgeStyle = "bg-slate-100 text-slate-500";
    if (isCorrect) { badgeText = "Correct"; badgeStyle = "bg-green-100 text-green-700"; }
    if (isWrong) { badgeText = "Incorrect"; badgeStyle = "bg-red-100 text-red-700"; }

    return (
        <div class={"glass-card p-5 border-l-4 " + borderColor + " space-y-3"}>
            <div class="flex items-start justify-between">
                <div class="text-sm font-medium text-slate-500">Question {String(props.index + 1)}</div>
                <div class={"text-xs uppercase tracking-[0.2em] font-semibold px-2 py-0.5 rounded-full " + badgeStyle}>
                    {badgeText}
                </div>
            </div>
            <div class="text-[color:var(--dashboard-ink)] font-medium">{r.prompt}</div>

            <Show when={r.questionType === "multiple-choice" && r.options.length > 0}>
                <div class="space-y-1.5">
                    <For each={r.options}>
                        {(opt, idx) => {
                            const isSelected = r.selectedOption === idx();
                            const isRightAnswer = r.correctOption === idx();
                            let optStyle = "bg-slate-100 text-slate-700";
                            let badgeStyle2 = "bg-slate-300 text-white";
                            if (isRightAnswer) { optStyle = "bg-green-100 text-green-800"; badgeStyle2 = "bg-green-500 text-white"; }
                            if (isSelected && !isRightAnswer) { optStyle = "bg-blue-100 text-blue-800"; badgeStyle2 = "bg-blue-500 text-white"; }
                            return (
                                <div class={"px-3 py-2 rounded-lg text-sm flex items-center gap-2 " + optStyle}>
                                    <span class={"w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 " + badgeStyle2}>
                                        {optionLabel(idx())}
                                    </span>
                                    {opt}
                                    <Show when={isSelected && !isRightAnswer}>
                                        <span class="text-xs ml-auto text-red-600">(your answer)</span>
                                    </Show>
                                    <Show when={isRightAnswer}>
                                        <span class="text-xs ml-auto text-green-700">(correct)</span>
                                    </Show>
                                </div>
                            );
                        }}
                    </For>
                </div>
            </Show>

            <Show when={r.questionType === "text"}>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Your answer</div>
                        <div class="px-3 py-2 rounded-lg bg-blue-100 text-blue-800">
                            {r.answerText || <span class="italic text-slate-400">(no answer)</span>}
                        </div>
                    </div>
                    <Show when={r.correctOption !== null}>
                        <div>
                            <div class="text-xs uppercase tracking-[0.2em] text-slate-500 mb-1">Correct answer</div>
                            <div class="px-3 py-2 rounded-lg bg-green-100 text-green-800">Answer text</div>
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}

function AttemptDetailPage() {
    const data = Route.useLoaderData();

    const scorePercent = () => {
        const d = data();
        if (d.score != null && d.maxScore != null && d.maxScore > 0) {
            return String(Math.round((d.score / d.maxScore) * 100)) + "%";
        }
        return "-";
    };

    return (
        <div class="mx-auto max-w-4xl px-6 py-12 space-y-8">
            <header class="space-y-2">
                <a href="/reports" class="text-xs uppercase tracking-[0.3em] text-slate-500 hover:text-slate-700">
                    &larr; Back to reports
                </a>
                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                    {data().quizName}
                </h1>
                <p class="text-slate-600">{data().studentName}</p>
            </header>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="glass-card p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">Score</div>
                    <div class="text-2xl font-bold text-[color:var(--dashboard-ink)]">{scorePercent()}</div>
                    <div class="text-xs text-slate-500">
                        {String(data().score ?? "-")} / {String(data().maxScore ?? "-")}
                    </div>
                </div>
                <div class="glass-card p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">Mode</div>
                    <div class="text-lg font-semibold text-[color:var(--dashboard-ink)] capitalize">{data().mode}</div>
                </div>
                <div class="glass-card p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">Duration</div>
                    <div class="text-lg font-semibold text-[color:var(--dashboard-ink)]">{formatDuration(data().durationMs)}</div>
                </div>
                <div class="glass-card p-4 text-center">
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">Completed</div>
                    <div class="text-lg font-semibold text-[color:var(--dashboard-ink)]">{formatDate(data().completedAt)}</div>
                </div>
            </div>

            <div class="space-y-4">
                <For each={data().responses}>
                    {(response, idx) => <ResponseCard response={response} index={idx()} />}
                </For>
            </div>
        </div>
    );
}

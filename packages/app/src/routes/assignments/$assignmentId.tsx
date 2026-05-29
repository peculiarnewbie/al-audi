import { Link, createFileRoute, redirect } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Show, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { getAssignmentQuizForPlay, submitQuizAttempt } from "~/server/quiz";
import type { MultipleChoiceQuestion } from "~/types/quiz";

export const Route = createFileRoute("/assignments/$assignmentId")({
    loader: ({ params }) =>
        getAssignmentQuizForPlay({
            data: { assignmentId: params.assignmentId },
        }),
    component: AssignmentDetailPage,
});

type AssignmentQuizResult = Awaited<ReturnType<typeof getAssignmentQuizForPlay>>;
type ResponseState = { answerText?: string; selectedOption?: number };

function AssignmentDetailPage() {
    const result = Route.useLoaderData();
    const [responses, setResponses] = createStore<Record<string, ResponseState>>({});
    const [status, setStatus] = createSignal<"idle" | "submitting" | "submitted" | "error">("idle");
    const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
    const [startedAt, setStartedAt] = createSignal<number | null>(null);

    onMount(() => setStartedAt(Date.now()));

    const resultData = createMemo(() => result() as unknown as AssignmentQuizResult);
    const quiz = createMemo(() => {
        const data = resultData();
        return data.success ? data.quiz : null;
    });
    const error = createMemo(() => {
        const data = resultData();
        return data.success ? null : data.error;
    });

    const existingAttempt = createMemo(() => quiz()?.existingResult ?? null);
    const isAlreadyCompleted = createMemo(() => existingAttempt() !== null);
    const isLocked = createMemo(() => status() === "submitted" || status() === "submitting" || isAlreadyCompleted());

    const isComplete = createMemo(() => {
        const current = quiz();
        if (!current) return false;
        return current.questions.every((question) => {
            const response = responses[question.id];
            if (question.type === "multiple-choice") return typeof response?.selectedOption === "number";
            return Boolean(response?.answerText?.trim());
        });
    });

    const formatDate = (ts: number | null) => {
        if (!ts) return "No due date";
        return new Date(ts).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault();
        const current = quiz();
        if (!current) return;

        const payloadResponses: { questionId: string; answerText?: string; selectedOption?: number }[] = [];
        for (const question of current.questions) {
            const response = responses[question.id];
            if (question.type === "multiple-choice") {
                if (typeof response?.selectedOption === "number") {
                    payloadResponses.push({ questionId: question.id, selectedOption: response.selectedOption });
                }
                continue;
            }
            const answerText = response?.answerText?.trim();
            if (answerText) payloadResponses.push({ questionId: question.id, answerText });
        }

        if (!payloadResponses.length) {
            setStatus("error");
            setErrorMessage("Answer at least one question.");
            return;
        }

        setStatus("submitting");
        setErrorMessage(null);

        const attemptResult = await submitQuizAttempt({
            data: {
                quizId: current.quizId,
                assignmentId: current.assignmentId,
                mode: "homework",
                startedAt: startedAt() ?? Date.now(),
                completedAt: Date.now(),
                responses: payloadResponses,
            },
        });

        if (attemptResult.success) {
            setStatus("submitted");
        } else {
            setStatus("error");
            setErrorMessage(attemptResult.error);
        }
    };

    return (
        <div class="mx-auto max-w-4xl px-6 py-12 space-y-6">
            <Show
                when={quiz()}
                fallback={
                    <div class="glass-panel p-6">
                        <div class="text-sm text-rose-600">{error() ?? "Assignment not found."}</div>
                        <Link
                            to="/assignments"
                            class="mt-4 inline-block rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
                        >
                            Back to assignments
                        </Link>
                    </div>
                }
            >
                {(currentQuiz) => {
                    const cq = currentQuiz();
                    return (
                        <div class="space-y-6">
                            <header class="space-y-2">
                                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                    Assignment
                                </div>
                                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                                    {cq.quizName}
                                </h1>
                                <div class="flex flex-wrap gap-4 text-sm text-slate-600">
                                    <span>Due: {formatDate(cq.dueAt)}</span>
                                    <span class="font-medium text-slate-900">
                                        {cq.questions.length} questions
                                    </span>
                                </div>
                            </header>

                            <Show when={isAlreadyCompleted()}>
                                <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                                    <div class="text-sm font-semibold text-emerald-700">
                                        Completed
                                    </div>
                                    <div class="text-sm text-emerald-700">
                                        Score: {existingAttempt()!.attempt.score}/{existingAttempt()!.attempt.maxScore}
                                    </div>
                                    <For each={existingAttempt()!.responses}>
                                        {(response) => (
                                            <div class="text-sm">
                                                <span class="font-medium">Q: {response.questionId}</span>{" "}
                                                <span class={response.isCorrect ? "text-emerald-600" : "text-rose-600"}>
                                                    {response.isCorrect ? "Correct" : "Incorrect"}
                                                </span>
                                            </div>
                                        )}
                                    </For>
                                    <Link
                                        to="/assignments"
                                        class="inline-block rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                                    >
                                        Back to assignments
                                    </Link>
                                </div>
                            </Show>

                            <Show when={!isAlreadyCompleted()}>
                                <form class="space-y-6" onSubmit={handleSubmit}>
                                    <For each={cq.questions}>
                                        {(question, index) => {
                                            const mcq = () =>
                                                question.type === "multiple-choice"
                                                    ? (question as MultipleChoiceQuestion)
                                                    : null;
                                            const response = () => responses[question.id];

                                            return (
                                                <div class="glass-card p-4 space-y-4">
                                                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                                        Question {index() + 1}
                                                    </div>
                                                    <div class="text-lg text-[color:var(--dashboard-ink)]">
                                                        {question.prompt}
                                                    </div>
                                                    <Show
                                                        when={mcq()}
                                                        fallback={
                                                            <input
                                                                type="text"
                                                                value={response()?.answerText ?? ""}
                                                                onInput={(event) =>
                                                                    setResponses(question.id, {
                                                                        answerText: event.currentTarget.value,
                                                                    })
                                                                }
                                                                placeholder="Type your answer"
                                                                disabled={isLocked()}
                                                                class="w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700"
                                                            />
                                                        }
                                                    >
                                                        {(multipleChoice) => (
                                                            <div class="space-y-2">
                                                                <For each={multipleChoice().options}>
                                                                    {(option, optionIndex) => (
                                                                        <label class="flex items-center gap-3 text-sm text-slate-700">
                                                                            <input
                                                                                type="radio"
                                                                                name={`question-${question.id}`}
                                                                                value={optionIndex()}
                                                                                checked={
                                                                                    response()?.selectedOption === optionIndex()
                                                                                }
                                                                                onChange={() =>
                                                                                    setResponses(question.id, {
                                                                                        selectedOption: optionIndex(),
                                                                                    })
                                                                                }
                                                                                disabled={isLocked()}
                                                                            />
                                                                            <span>{option}</span>
                                                                        </label>
                                                                    )}
                                                                </For>
                                                            </div>
                                                        )}
                                                    </Show>
                                                </div>
                                            );
                                        }}
                                    </For>

                                    <div class="flex flex-wrap items-center gap-4">
                                        <button
                                            type="submit"
                                            disabled={!isComplete() || isLocked()}
                                            class="rounded-full bg-[color:var(--dashboard-accent)] px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-60"
                                        >
                                            {status() === "submitting"
                                                ? "Submitting"
                                                : status() === "submitted"
                                                  ? "Submitted"
                                                  : "Submit quiz"}
                                        </button>
                                        <Show when={errorMessage()}>
                                            <span class="text-sm text-rose-600">{errorMessage()}</span>
                                        </Show>
                                    </div>
                                </form>
                            </Show>

                            <Show when={status() === "submitted"}>
                                <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                    <div class="text-sm font-semibold text-emerald-700">
                                        Submitted! Your score will be available shortly.
                                    </div>
                                    <Link
                                        to="/assignments"
                                        class="mt-3 inline-block rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                                    >
                                        Back to assignments
                                    </Link>
                                </div>
                            </Show>
                        </div>
                    );
                }}
            </Show>
        </div>
    );
}

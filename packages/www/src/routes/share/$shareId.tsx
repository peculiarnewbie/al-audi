import { createFileRoute } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Show, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { z } from "zod";
import type { MultipleChoiceQuestion } from "core";
import { getSharedQuiz, submitQuizAttempt } from "~/server/quiz";

const shareSearchSchema = z
    .object({
        token: z.string().trim().min(1).optional(),
    })
    .default({});

export const Route = createFileRoute("/share/$shareId")({
    validateSearch: (search) => shareSearchSchema.parse(search),
    loader: ({ params, search }) =>
        getSharedQuiz({
            data: {
                shareId: params.shareId,
                token: search.token,
            },
        }),
    component: SharedQuizPage,
});

type SharedQuizResult = Awaited<ReturnType<typeof getSharedQuiz>>;

type ResponseState = {
    answerText?: string;
    selectedOption?: number;
};

function SharedQuizPage() {
    const result = Route.useLoaderData();
    const [tokenInput, setTokenInput] = createSignal("");
    const [responses, setResponses] = createStore<
        Record<string, ResponseState>
    >({});
    const [status, setStatus] = createSignal<
        "idle" | "submitting" | "submitted" | "error"
    >("idle");
    const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
    const [score, setScore] = createSignal<{
        score: number;
        maxScore: number;
    } | null>(null);
    const [startedAt, setStartedAt] = createSignal<number | null>(null);

    onMount(() => {
        setStartedAt(Date.now());
    });

    const resultData = createMemo(
        () => result() as unknown as SharedQuizResult,
    );
    const quiz = createMemo(() => {
        const data = resultData();
        return data.success ? data.quiz : null;
    });
    const viewer = createMemo(() => quiz()?.viewer ?? null);
    const errorResult = createMemo(() => {
        const data = resultData();
        return data.success ? null : data;
    });

    const isComplete = createMemo(() => {
        const current = quiz();

        if (!current) {
            return false;
        }

        return current.questions.every((question) => {
            const response = responses[question.id];

            if (question.type === "multiple-choice") {
                return typeof response?.selectedOption === "number";
            }

            return Boolean(response?.answerText?.trim());
        });
    });
    const isLocked = createMemo(
        () => status() === "submitted" || status() === "submitting",
    );

    const handleTokenSubmit = (event: SubmitEvent) => {
        event.preventDefault();
        const token = tokenInput().trim();

        if (!token || typeof window === "undefined") {
            return;
        }

        const url = new URL(window.location.href);
        url.searchParams.set("token", token);
        window.location.assign(url.toString());
    };

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault();
        const current = quiz();

        if (!current) {
            return;
        }

        if (!viewer()) {
            setStatus("error");
            setErrorMessage("Sign in to submit this quiz.");
            return;
        }

        const payloadResponses: {
            questionId: string;
            answerText?: string;
            selectedOption?: number;
        }[] = [];

        for (const question of current.questions) {
            const response = responses[question.id];

            if (question.type === "multiple-choice") {
                if (typeof response?.selectedOption === "number") {
                    payloadResponses.push({
                        questionId: question.id,
                        selectedOption: response.selectedOption,
                    });
                }
                continue;
            }

            const answerText = response?.answerText?.trim();

            if (answerText) {
                payloadResponses.push({
                    questionId: question.id,
                    answerText,
                });
            }
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
                mode: "homework",
                startedAt: startedAt() ?? Date.now(),
                completedAt: Date.now(),
                responses: payloadResponses,
            },
        });

        if (attemptResult.success) {
            setStatus("submitted");
            setScore({
                score: attemptResult.score,
                maxScore: attemptResult.maxScore,
            });
        } else {
            setStatus("error");
            setErrorMessage(attemptResult.error);
        }
    };

    return (
        <div class="mx-auto max-w-5xl px-6 py-12 space-y-6">
            <Show
                when={quiz()}
                fallback={
                    <div class="glass-panel p-6 space-y-4">
                        <div class="text-sm text-rose-600">
                            {errorResult()?.error ?? "Share link unavailable."}
                        </div>
                        <Show when={errorResult()?.requiresToken}>
                            <form
                                class="flex flex-wrap items-center gap-3"
                                onSubmit={handleTokenSubmit}
                            >
                                <input
                                    type="text"
                                    value={tokenInput()}
                                    onInput={(event) =>
                                        setTokenInput(event.currentTarget.value)
                                    }
                                    placeholder="Enter access token"
                                    class="flex-1 min-w-[220px] rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700"
                                />
                                <button
                                    type="submit"
                                    class="rounded-full bg-[color:var(--dashboard-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                                >
                                    Unlock quiz
                                </button>
                            </form>
                        </Show>
                    </div>
                }
            >
                {(sharedQuiz) => {
                    const currentQuiz = sharedQuiz();

                    return (
                        <div class="space-y-6">
                            <header class="space-y-2">
                                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                    Shared quiz
                                </div>
                                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                                    Homework quiz
                                </h1>
                                <p class="text-sm text-slate-600">
                                    Complete each question and submit when
                                    you&apos;re ready.
                                </p>
                            </header>

                            <Show when={!viewer()}>
                                <div class="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600">
                                    Sign in to submit answers.{" "}
                                    <a
                                        href="/api/auth/sign-in"
                                        class="text-slate-900 underline"
                                    >
                                        Sign in
                                    </a>
                                </div>
                            </Show>

                            <form class="space-y-6" onSubmit={handleSubmit}>
                                <For each={currentQuiz.questions}>
                                    {(question, index) => {
                                        const multipleChoiceQuestion = () =>
                                            question.type === "multiple-choice"
                                                ? (question as MultipleChoiceQuestion)
                                                : null;
                                        const response = () =>
                                            responses[question.id];

                                        return (
                                            <div class="glass-card p-4 space-y-4">
                                                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                                    Question {index() + 1}
                                                </div>
                                                <div class="text-lg text-[color:var(--dashboard-ink)]">
                                                    {question.prompt}
                                                </div>
                                                <Show
                                                    when={multipleChoiceQuestion()}
                                                    fallback={
                                                        <input
                                                            type="text"
                                                            value={
                                                                response()
                                                                    ?.answerText ??
                                                                ""
                                                            }
                                                            onInput={(event) =>
                                                                setResponses(
                                                                    question.id,
                                                                    {
                                                                        answerText:
                                                                            event
                                                                                .currentTarget
                                                                                .value,
                                                                    },
                                                                )
                                                            }
                                                            placeholder="Type your answer"
                                                            disabled={isLocked()}
                                                            class="w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700"
                                                        />
                                                    }
                                                >
                                                    {(multipleChoice) => (
                                                        <div class="space-y-2">
                                                            <For
                                                                each={
                                                                    multipleChoice()
                                                                        .options
                                                                }
                                                            >
                                                                {(
                                                                    option,
                                                                    optionIndex,
                                                                ) => (
                                                                    <label class="flex items-center gap-3 text-sm text-slate-700">
                                                                        <input
                                                                            type="radio"
                                                                            name={`question-${question.id}`}
                                                                            value={optionIndex()}
                                                                            checked={
                                                                                response()
                                                                                    ?.selectedOption ===
                                                                                optionIndex()
                                                                            }
                                                                            onChange={() =>
                                                                                setResponses(
                                                                                    question.id,
                                                                                    {
                                                                                        selectedOption:
                                                                                            optionIndex(),
                                                                                    },
                                                                                )
                                                                            }
                                                                            disabled={isLocked()}
                                                                        />
                                                                        <span>
                                                                            {
                                                                                option
                                                                            }
                                                                        </span>
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
                                        disabled={
                                            !isComplete() ||
                                            isLocked() ||
                                            !viewer()
                                        }
                                        class="rounded-full bg-[color:var(--dashboard-accent)] px-6 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-60"
                                    >
                                        {status() === "submitting"
                                            ? "Submitting"
                                            : status() === "submitted"
                                              ? "Submitted"
                                              : "Submit quiz"}
                                    </button>
                                    <Show when={errorMessage()}>
                                        <span class="text-sm text-rose-600">
                                            {errorMessage()}
                                        </span>
                                    </Show>
                                </div>
                            </form>

                            <Show when={score()}>
                                <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                                    Score {score()!.score} / {score()!.maxScore}
                                </div>
                            </Show>
                        </div>
                    );
                }}
            </Show>
        </div>
    );
}

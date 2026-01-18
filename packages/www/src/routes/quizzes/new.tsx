import { createFileRoute, redirect } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { nanoid } from "nanoid";
import { createMemo, createSignal, For, Index, Show } from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";
import type { MultipleChoiceQuestion, QuizQuestion, TextQuestion } from "core";
import { QuizPreview } from "~/components/quiz-preview";
import type { AuthUser } from "~/utils/workos-auth.server";
import { saveQuiz } from "~/server/quiz";

const getUser = createServerFn({ method: "GET" }).handler(
    async (): Promise<AuthUser | null> => {
        const { getAuthenticatedUser } =
            await import("~/utils/workos-auth.server");
        const { getRequestHeaders } =
            await import("@tanstack/solid-start/server");
        return getAuthenticatedUser(getRequestHeaders());
    },
);

export const Route = createFileRoute("/quizzes/new")({
    loader: async () => {
        const user = await getUser();

        if (!user) {
            throw redirect({ href: "/api/auth/sign-in" });
        }

        return user;
    },
    component: QuizCreatePage,
});

const createMultipleChoiceQuestion = (): MultipleChoiceQuestion => ({
    id: nanoid(10),
    type: "multiple-choice",
    prompt: "",
    options: ["", ""],
    correctOptionIndex: null,
});

const createTextQuestion = (): TextQuestion => ({
    id: nanoid(10),
    type: "text",
    prompt: "",
    answer: "",
});

function QuizCreatePage() {
    const user = Route.useLoaderData();
    const [questions, setQuestions] = createStore<QuizQuestion[]>([
        createMultipleChoiceQuestion(),
    ]);
    const [previewMode, setPreviewMode] = createSignal(false);
    const [status, setStatus] = createSignal<
        "idle" | "saving" | "saved" | "error"
    >("idle");
    const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
    const [savedQuizId, setSavedQuizId] = createSignal<string | null>(null);

    const isValid = createMemo(() => {
        const currentQuestions = questions;

        if (!currentQuestions.length) {
            return false;
        }

        return currentQuestions.every((question: QuizQuestion) => {
            if (!question.prompt.trim()) {
                return false;
            }

            if (question.type === "multiple-choice") {
                const trimmedOptions = question.options.map((option: string) =>
                    option.trim(),
                );

                if (trimmedOptions.length < 2) {
                    return false;
                }

                if (trimmedOptions.some((option: string) => !option)) {
                    return false;
                }
            }

            return true;
        });
    });

    const removeQuestion = (questionId: string) => {
        setQuestions((current) =>
            current.filter((question) => question.id !== questionId),
        );
    };

    const addMultipleChoice = () => {
        setQuestions((current) => [...current, createMultipleChoiceQuestion()]);
    };

    const addTextQuestion = () => {
        setQuestions((current) => [...current, createTextQuestion()]);
    };

    const updatePrompt = (questionId: string, value: string) => {
        setQuestions(
            produce((current) => {
                const target = current.find(
                    (question) => question.id === questionId,
                );

                if (target) {
                    target.prompt = value;
                }
            }),
        );
    };

    const updateTextAnswer = (questionId: string, value: string) => {
        setQuestions(
            produce((current) => {
                const target = current.find(
                    (question): question is TextQuestion =>
                        question.id === questionId && question.type === "text",
                );

                if (target) {
                    target.answer = value;
                }
            }),
        );
    };

    const updateMultipleChoiceOption = (
        questionId: string,
        optionIndex: number,
        value: string,
    ) => {
        setQuestions(
            produce((current) => {
                const target = current.find(
                    (question): question is MultipleChoiceQuestion =>
                        question.id === questionId &&
                        question.type === "multiple-choice",
                );

                if (target) {
                    target.options[optionIndex] = value;
                }
            }),
        );
    };

    const addMultipleChoiceOption = (questionId: string) => {
        setQuestions(
            produce((current) => {
                const target = current.find(
                    (question): question is MultipleChoiceQuestion =>
                        question.id === questionId &&
                        question.type === "multiple-choice",
                );

                if (target) {
                    target.options.push("");
                }
            }),
        );
    };

    const removeMultipleChoiceOption = (
        questionId: string,
        optionIndex: number,
    ) => {
        setQuestions(
            produce((current) => {
                const target = current.find(
                    (question): question is MultipleChoiceQuestion =>
                        question.id === questionId &&
                        question.type === "multiple-choice",
                );

                if (!target) {
                    return;
                }

                const nextOptions = target.options.filter(
                    (_: string, index: number) => index !== optionIndex,
                );
                let nextCorrect = target.correctOptionIndex;

                if (nextCorrect !== null) {
                    if (optionIndex === nextCorrect) {
                        nextCorrect = null;
                    } else if (optionIndex < nextCorrect) {
                        nextCorrect -= 1;
                    }
                }

                target.options = nextOptions.length ? nextOptions : ["", ""];
                target.correctOptionIndex = nextCorrect;
            }),
        );
    };

    const updateCorrectOption = (questionId: string, value: string) => {
        setQuestions(
            produce((current) => {
                const target = current.find(
                    (question): question is MultipleChoiceQuestion =>
                        question.id === questionId &&
                        question.type === "multiple-choice",
                );

                if (target) {
                    target.correctOptionIndex = value
                        ? Number.parseInt(value, 10)
                        : null;
                }
            }),
        );
    };

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault();
        setStatus("saving");
        setErrorMessage(null);
        setSavedQuizId(null);

        const result = await saveQuiz({
            data: { questions: unwrap(questions) },
        });

        if (result.success) {
            setStatus("saved");
            setSavedQuizId(result.id);
        } else {
            setStatus("error");
            setErrorMessage(result.error);
        }
    };

    return (
        <div class="max-w-4xl mx-auto px-6 py-12 space-y-8">
            <header class="space-y-2">
                <div class="text-xs uppercase tracking-wide text-stone-500">
                    Signed in as {user().email}
                </div>
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <h1 class="text-2xl font-semibold text-stone-800">
                        Create a Quiz
                    </h1>
                    <button
                        type="button"
                        onClick={() => setPreviewMode((current) => !current)}
                        class="px-4 py-2 border border-stone-300 rounded text-stone-700 hover:text-stone-900"
                    >
                        {previewMode() ? "Back to editor" : "Preview"}
                    </button>
                </div>
            </header>

            <form class="space-y-6" onSubmit={handleSubmit}>
                <Show
                    when={!previewMode()}
                    fallback={<QuizPreview questions={questions} />}
                >
                    <div class="space-y-6">
                        <For each={questions}>
                            {(question, index) => {
                                const multipleChoiceQuestion = () =>
                                    question.type === "multiple-choice"
                                        ? (question as MultipleChoiceQuestion)
                                        : null;

                                return (
                                    <div class="rounded-xl border border-stone-200 bg-white p-4 shadow-sm space-y-4">
                                        <div class="flex items-center justify-between">
                                            <div class="text-sm font-medium text-stone-700">
                                                Question {index() + 1}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeQuestion(question.id)
                                                }
                                                class="text-xs uppercase tracking-wide text-rose-600"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <div class="space-y-3">
                                            <input
                                                type="text"
                                                value={question.prompt}
                                                onInput={(event) =>
                                                    updatePrompt(
                                                        question.id,
                                                        event.currentTarget
                                                            .value,
                                                    )
                                                }
                                                placeholder="Question prompt"
                                                class="w-full px-3 py-2 border border-stone-200 rounded"
                                            />
                                            <Show
                                                when={multipleChoiceQuestion()}
                                                fallback={
                                                    <div class="space-y-2">
                                                        <div class="text-xs uppercase tracking-wide text-stone-500">
                                                            Suggested answer
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={
                                                                question.type ===
                                                                "text"
                                                                    ? question.answer
                                                                    : ""
                                                            }
                                                            onInput={(event) =>
                                                                updateTextAnswer(
                                                                    question.id,
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="Enter an answer"
                                                            class="w-full px-3 py-2 border border-stone-200 rounded"
                                                        />
                                                    </div>
                                                }
                                            >
                                                {(
                                                    multipleChoice: () => MultipleChoiceQuestion,
                                                ) => (
                                                    <div class="space-y-3">
                                                        <div class="text-xs uppercase tracking-wide text-stone-500">
                                                            Options
                                                        </div>
                                                        <div class="space-y-2">
                                                            <Index
                                                                each={
                                                                    multipleChoice()
                                                                        .options
                                                                }
                                                            >
                                                                {(
                                                                    option,
                                                                    optionIndex,
                                                                ) => (
                                                                    <div class="flex items-center gap-2">
                                                                        <input
                                                                            type="text"
                                                                            value={option()}
                                                                            onInput={(
                                                                                event,
                                                                            ) =>
                                                                                updateMultipleChoiceOption(
                                                                                    question.id,
                                                                                    optionIndex,
                                                                                    event
                                                                                        .currentTarget
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            placeholder={`Option ${
                                                                                optionIndex +
                                                                                1
                                                                            }`}
                                                                            class="flex-1 px-3 py-2 border border-stone-200 rounded"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            disabled={
                                                                                multipleChoice()
                                                                                    .options
                                                                                    .length <=
                                                                                2
                                                                            }
                                                                            onClick={() =>
                                                                                removeMultipleChoiceOption(
                                                                                    question.id,
                                                                                    optionIndex,
                                                                                )
                                                                            }
                                                                            class="px-3 py-2 text-xs uppercase tracking-wide text-stone-500 border border-stone-200 rounded disabled:opacity-50"
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </Index>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                addMultipleChoiceOption(
                                                                    question.id,
                                                                )
                                                            }
                                                            class="text-sm text-stone-600"
                                                        >
                                                            Add option
                                                        </button>
                                                        <div class="space-y-2">
                                                            <div class="text-xs uppercase tracking-wide text-stone-500">
                                                                Correct answer
                                                            </div>
                                                            <select
                                                                value={
                                                                    multipleChoice()
                                                                        .correctOptionIndex ??
                                                                    ""
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    updateCorrectOption(
                                                                        question.id,
                                                                        event
                                                                            .currentTarget
                                                                            .value,
                                                                    )
                                                                }
                                                                class="w-full px-3 py-2 border border-stone-200 rounded"
                                                            >
                                                                <option value="">
                                                                    Select an
                                                                    option
                                                                </option>
                                                                <For
                                                                    each={
                                                                        multipleChoice()
                                                                            .options
                                                                    }
                                                                >
                                                                    {(
                                                                        _: string,
                                                                        optionIndex: () => number,
                                                                    ) => (
                                                                        <option
                                                                            value={optionIndex()}
                                                                        >
                                                                            Option{" "}
                                                                            {optionIndex() +
                                                                                1}
                                                                        </option>
                                                                    )}
                                                                </For>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </Show>
                                        </div>
                                    </div>
                                );
                            }}
                        </For>
                        <div class="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={addMultipleChoice}
                                class="px-4 py-2 border border-stone-300 rounded text-stone-700"
                            >
                                Add multiple choice
                            </button>
                            <button
                                type="button"
                                onClick={addTextQuestion}
                                class="px-4 py-2 border border-stone-300 rounded text-stone-700"
                            >
                                Add text question
                            </button>
                        </div>
                    </div>
                </Show>

                <div class="flex flex-wrap items-center gap-4">
                    <button
                        type="submit"
                        disabled={!isValid() || status() === "saving"}
                        class="px-6 py-2 bg-stone-800 text-white rounded disabled:opacity-50"
                    >
                        {status() === "saving" ? "Saving" : "Save quiz"}
                    </button>
                    <Show when={status() === "saved" && savedQuizId()}>
                        <span class="text-sm text-emerald-600">
                            Saved quiz {savedQuizId()}
                        </span>
                    </Show>
                    <Show when={status() === "error" && errorMessage()}>
                        <span class="text-sm text-rose-600">
                            {errorMessage()}
                        </span>
                    </Show>
                </div>
            </form>
        </div>
    );
}

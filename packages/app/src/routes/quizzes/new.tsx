import { createFileRoute, redirect } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { nanoid } from "nanoid";
import { createMemo, createSignal, For, Index, Show } from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";
import type { MultipleChoiceQuestion, QuizQuestion, TextQuestion } from "~/types/quiz";
import { QuizPreview } from "~/components/quiz-preview";
import { createQuizShareLink, saveQuiz } from "~/server/quiz";
import type { AuthUser } from "~/utils/auth.server";

const getUser = createServerFn({ method: "GET" }).handler(
    async (): Promise<AuthUser | null> => {
        const { getAuthenticatedUser } =
            await import("~/utils/auth.server");
        const { getRequestHeaders } =
            await import("@tanstack/solid-start/server");
        return getAuthenticatedUser(getRequestHeaders());
    },
);

export const Route = createFileRoute("/quizzes/new")({
    loader: async () => {
        const user = await getUser();

        if (!user) {
            throw redirect({ href: "/sign-in?next=/quizzes/new" });
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

type QuestionImageState = {
    status: "idle" | "uploading" | "uploaded" | "error";
    previewUrl?: string;
    r2Key?: string;
    fileName?: string;
    errorMessage?: string;
};

function QuizCreatePage() {
    const user = Route.useLoaderData();
    const [questions, setQuestions] = createStore<QuizQuestion[]>([
        createMultipleChoiceQuestion(),
    ]);
    const [questionImages, setQuestionImages] = createStore<
        Record<string, QuestionImageState>
    >({});
    const [previewMode, setPreviewMode] = createSignal(false);
    const [status, setStatus] = createSignal<
        "idle" | "saving" | "saved" | "error"
    >("idle");
    const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
    const [savedQuizId, setSavedQuizId] = createSignal<string | null>(null);
    const [quizId, setQuizId] = createSignal<string | null>(null);
    const [shareStatus, setShareStatus] = createSignal<
        "idle" | "creating" | "ready" | "error"
    >("idle");
    const [shareError, setShareError] = createSignal<string | null>(null);
    const [shareLink, setShareLink] = createSignal<{
        shareId: string;
        accessToken: string | null;
    } | null>(null);
    const [shareRequiresToken, setShareRequiresToken] = createSignal(false);
    const [quizTitle, setQuizTitle] = createSignal("");
    const [categoryInputs, setCategoryInputs] = createStore({
        level: "",
        topic: "",
        skill: "",
    });

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

    const categorySummary = createMemo(() => ({
        level: categoryInputs.level.trim(),
        topic: categoryInputs.topic.trim(),
        skill: categoryInputs.skill.trim(),
    }));

    const sharePath = createMemo(() => {
        const link = shareLink();

        if (!link) {
            return null;
        }

        const token = link.accessToken ? `?token=${link.accessToken}` : "";
        return `/share/${link.shareId}${token}`;
    });

    const shareUrl = createMemo(() => {
        const path = sharePath();

        if (!path) {
            return null;
        }

        if (typeof window === "undefined") {
            return path;
        }

        return new URL(path, window.location.origin).toString();
    });

    const qrCodePath = createMemo(() => {
        const link = shareLink();

        if (!link) {
            return null;
        }

        const token = link.accessToken
            ? `?token=${encodeURIComponent(link.accessToken)}`
            : "";
        return `/api/share/${link.shareId}/qr${token}`;
    });

    const buildCategoryPayload = () => {
        const summary = categorySummary();
        const payload = {
            level: summary.level || undefined,
            topic: summary.topic || undefined,
            skill: summary.skill || undefined,
        };

        return Object.values(payload).some(Boolean) ? payload : undefined;
    };

    const getQuizId = () => {
        const current = quizId();

        if (current) {
            return current;
        }

        const nextId = nanoid(10);
        setQuizId(nextId);
        return nextId;
    };

    const clearQuestionImage = (questionId: string) => {
        const currentImage = questionImages[questionId];

        if (currentImage?.previewUrl) {
            URL.revokeObjectURL(currentImage.previewUrl);
        }

        setQuestionImages(
            produce((current) => {
                delete current[questionId];
            }),
        );
    };

    const uploadQuestionImage = async (
        questionId: string,
        file: File,
    ): Promise<void> => {
        const currentPreview = questionImages[questionId]?.previewUrl;

        if (currentPreview) {
            URL.revokeObjectURL(currentPreview);
        }

        const previewUrl = URL.createObjectURL(file);
        setQuestionImages(questionId, {
            status: "uploading",
            previewUrl,
            fileName: file.name,
        });

        try {
            const formData = new FormData();
            formData.append("quizId", getQuizId());
            formData.append("questionId", questionId);
            formData.append("file", file);

            const response = await fetch("/api/quizzes/media", {
                method: "POST",
                body: formData,
            });

            const payload = (await response.json()) as {
                r2Key?: string;
                error?: string;
            };

            if (!response.ok) {
                setQuestionImages(questionId, (current) => ({
                    ...current,
                    status: "error",
                    errorMessage: payload.error ?? "Upload failed.",
                }));
                return;
            }

            setQuestionImages(questionId, (current) => ({
                ...current,
                status: "uploaded",
                r2Key: payload.r2Key,
                errorMessage: undefined,
            }));
        } catch (error) {
            console.error("Failed to upload question image", error);
            setQuestionImages(questionId, (current) => ({
                ...current,
                status: "error",
                errorMessage: "Upload failed.",
            }));
        }
    };

    const handleImageSelection = async (questionId: string, event: Event) => {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        input.value = "";
        await uploadQuestionImage(questionId, file);
    };

    const removeQuestion = (questionId: string) => {
        clearQuestionImage(questionId);
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
        setShareLink(null);
        setShareStatus("idle");
        setShareError(null);

        const result = await saveQuiz({
            data: {
                quizId: getQuizId(),
                name: quizTitle().trim() || undefined,
                questions: unwrap(questions),
                categories: buildCategoryPayload(),
            },
        });

        if (result.success) {
            setStatus("saved");
            setSavedQuizId(result.id);
        } else {
            setStatus("error");
            setErrorMessage(result.error);
        }
    };

    const handleCreateShareLink = async () => {
        const currentQuizId = savedQuizId();

        if (!currentQuizId) {
            return;
        }

        setShareStatus("creating");
        setShareError(null);

        const result = await createQuizShareLink({
            data: {
                quizId: currentQuizId,
                requireToken: shareRequiresToken(),
            },
        });

        if (result.success) {
            setShareLink({
                shareId: result.shareId,
                accessToken: result.accessToken,
            });
            setShareStatus("ready");
        } else {
            setShareStatus("error");
            setShareError(result.error);
        }
    };

    return (
        <div class="mx-auto max-w-5xl px-6 py-12 space-y-8">
            <header class="space-y-2">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Signed in as {user().email}
                </div>
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                        Create a Quiz
                    </h1>
                    <button
                        type="button"
                        onClick={() => setPreviewMode((current) => !current)}
                        class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-white"
                    >
                        {previewMode() ? "Back to editor" : "Preview"}
                    </button>
                </div>
            </header>

            <form class="space-y-6" onSubmit={handleSubmit}>
                <div class="glass-panel p-4 space-y-2">
                    <label class="text-xs uppercase tracking-[0.2em] text-slate-500" for="quiz-title">
                        Title
                    </label>
                    <input
                        id="quiz-title"
                        type="text"
                        value={quizTitle()}
                        onInput={(e) => setQuizTitle(e.currentTarget.value)}
                        placeholder="e.g. Unit 3 Vocabulary Quiz"
                        class="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-lg font-semibold text-slate-700"
                    />
                </div>

                <Show
                    when={!previewMode()}
                    fallback={
                        <div class="glass-panel p-4 space-y-3">
                            <div class="text-xs uppercase tracking-wide text-stone-500">
                                Quiz categories
                            </div>
                            <div class="flex flex-wrap gap-2 text-sm">
                                <Show
                                    when={
                                        categorySummary().level ||
                                        categorySummary().topic ||
                                        categorySummary().skill
                                    }
                                    fallback={
                                        <span class="text-sm text-stone-500">
                                            No categories yet.
                                        </span>
                                    }
                                >
                                    <Show when={categorySummary().level}>
                                        <span class="px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                                            Level: {categorySummary().level}
                                        </span>
                                    </Show>
                                    <Show when={categorySummary().topic}>
                                        <span class="px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                                            Topic: {categorySummary().topic}
                                        </span>
                                    </Show>
                                    <Show when={categorySummary().skill}>
                                        <span class="px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                                            Skill: {categorySummary().skill}
                                        </span>
                                    </Show>
                                </Show>
                            </div>
                        </div>
                    }
                >
                    <div class="glass-panel p-4 space-y-4">
                        <div class="text-xs uppercase tracking-wide text-stone-500">
                            Quiz categories
                        </div>
                        <div class="grid gap-4 sm:grid-cols-3">
                            <label class="space-y-2">
                                <span class="text-xs uppercase tracking-wide text-stone-500">
                                    Level
                                </span>
                                <input
                                    type="text"
                                    value={categoryInputs.level}
                                    onInput={(event) =>
                                        setCategoryInputs(
                                            "level",
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder="Beginner"
                                    class="w-full px-3 py-2 border border-stone-200 rounded"
                                />
                            </label>
                            <label class="space-y-2">
                                <span class="text-xs uppercase tracking-wide text-stone-500">
                                    Topic
                                </span>
                                <input
                                    type="text"
                                    value={categoryInputs.topic}
                                    onInput={(event) =>
                                        setCategoryInputs(
                                            "topic",
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder="Grammar"
                                    class="w-full px-3 py-2 border border-stone-200 rounded"
                                />
                            </label>
                            <label class="space-y-2">
                                <span class="text-xs uppercase tracking-wide text-stone-500">
                                    Skill
                                </span>
                                <input
                                    type="text"
                                    value={categoryInputs.skill}
                                    onInput={(event) =>
                                        setCategoryInputs(
                                            "skill",
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder="Listening"
                                    class="w-full px-3 py-2 border border-stone-200 rounded"
                                />
                            </label>
                        </div>
                    </div>
                </Show>
                <Show
                    when={!previewMode()}
                    fallback={
                        <QuizPreview
                            questions={questions}
                            imageByQuestionId={questionImages}
                        />
                    }
                >
                    <div class="space-y-6">
                        <For each={questions}>
                            {(question, index) => {
                                const multipleChoiceQuestion = () =>
                                    question.type === "multiple-choice"
                                        ? (question as MultipleChoiceQuestion)
                                        : null;
                                const imageState = () =>
                                    questionImages[question.id];

                                return (
                                    <div class="glass-card p-4 space-y-4">
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
                                            <div class="space-y-2">
                                                <div class="text-xs uppercase tracking-wide text-stone-500">
                                                    Question image
                                                </div>
                                                <div class="flex flex-wrap items-center gap-3">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        disabled={
                                                            imageState()
                                                                ?.status ===
                                                            "uploading"
                                                        }
                                                        onChange={(event) =>
                                                            handleImageSelection(
                                                                question.id,
                                                                event,
                                                            )
                                                        }
                                                        class="text-sm text-stone-600 file:mr-3 file:rounded file:border file:border-stone-200 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-stone-600"
                                                    />
                                                    <Show
                                                        when={
                                                            imageState()
                                                                ?.status ===
                                                            "uploading"
                                                        }
                                                    >
                                                        <span class="text-xs text-stone-500">
                                                            Uploading...
                                                        </span>
                                                    </Show>
                                                    <Show
                                                        when={
                                                            imageState()
                                                                ?.status ===
                                                            "uploaded"
                                                        }
                                                    >
                                                        <span class="text-xs text-emerald-600">
                                                            Image uploaded
                                                        </span>
                                                    </Show>
                                                    <Show
                                                        when={
                                                            imageState()
                                                                ?.status ===
                                                            "error"
                                                        }
                                                    >
                                                        <span class="text-xs text-rose-600">
                                                            {imageState()
                                                                ?.errorMessage ??
                                                                "Upload failed."}
                                                        </span>
                                                    </Show>
                                                </div>
                                                <Show
                                                    when={
                                                        imageState()?.previewUrl
                                                    }
                                                >
                                                    <img
                                                        src={
                                                            imageState()
                                                                ?.previewUrl
                                                        }
                                                        alt="Question illustration"
                                                        class="w-full max-h-64 rounded-lg border border-stone-200 object-contain"
                                                    />
                                                </Show>
                                            </div>
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
                        class="rounded-full bg-[color:var(--dashboard-accent)] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-50"
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

                <Show when={savedQuizId()}>
                    <div class="glass-panel p-4 space-y-3">
                        <div class="text-xs uppercase tracking-wide text-stone-500">
                            Share link
                        </div>
                        <div class="flex flex-wrap items-center gap-3">
                            <label class="flex items-center gap-2 text-sm text-stone-600">
                                <input
                                    type="checkbox"
                                    checked={shareRequiresToken()}
                                    onChange={(event) =>
                                        setShareRequiresToken(
                                            event.currentTarget.checked,
                                        )
                                    }
                                />
                                Require access token
                            </label>
                            <button
                                type="button"
                                onClick={handleCreateShareLink}
                                disabled={shareStatus() === "creating"}
                                class="px-4 py-2 border border-stone-300 rounded text-stone-700"
                            >
                                {shareStatus() === "creating"
                                    ? "Generating"
                                    : "Generate link"}
                            </button>
                            <Show
                                when={shareStatus() === "ready" && shareUrl()}
                            >
                                <span class="text-xs text-emerald-600">
                                    Share link ready
                                </span>
                            </Show>
                        </div>
                        <Show when={shareUrl()}>
                            <div class="space-y-2">
                                <div class="text-xs uppercase tracking-wide text-stone-500">
                                    Share URL
                                </div>
                                <input
                                    type="text"
                                    value={shareUrl() ?? ""}
                                    readOnly
                                    class="w-full px-3 py-2 border border-stone-200 rounded text-sm"
                                />
                                <Show when={shareLink()?.accessToken}>
                                    <div class="text-xs uppercase tracking-wide text-stone-500">
                                        Access token
                                    </div>
                                    <div class="text-sm text-stone-700">
                                        {shareLink()?.accessToken}
                                    </div>
                                </Show>
                            </div>
                        </Show>
                        <Show when={qrCodePath()}>
                            <div class="space-y-2">
                                <div class="text-xs uppercase tracking-wide text-stone-500">
                                    QR code
                                </div>
                                <img
                                    src={qrCodePath() ?? ""}
                                    alt="Shared quiz QR code"
                                    class="h-40 w-40 rounded border border-stone-200 bg-white p-2"
                                />
                            </div>
                        </Show>
                        <Show when={shareStatus() === "error" && shareError()}>
                            <div class="text-sm text-rose-600">
                                {shareError()}
                            </div>
                        </Show>
                    </div>
                </Show>
            </form>
        </div>
    );
}

import { For, Show } from "solid-js";
import type { MultipleChoiceQuestion, QuizQuestion } from "core";

const optionLabel = (index: number) => String.fromCharCode(65 + index);

export function QuizPreview(props: { questions: QuizQuestion[] }) {
    return (
        <div class="space-y-6">
            <For each={props.questions}>
                {(question, index) => {
                    const multipleChoiceQuestion = () =>
                        question.type === "multiple-choice"
                            ? (question as MultipleChoiceQuestion)
                            : null;

                    return (
                        <div class="rounded-xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
                            <div class="text-xs uppercase tracking-wide text-stone-500">
                                Question {index() + 1}
                            </div>
                            <div class="text-lg text-stone-800">
                                {question.prompt || "Untitled question"}
                            </div>
                            <Show
                                when={multipleChoiceQuestion()}
                                fallback={
                                    <input
                                        type="text"
                                        class="w-full px-3 py-2 border border-stone-200 rounded"
                                        placeholder="Text response"
                                        disabled
                                    />
                                }
                            >
                                {(
                                    multipleChoice: () => MultipleChoiceQuestion,
                                ) => (
                                    <ul class="space-y-2">
                                        <For each={multipleChoice().options}>
                                            {(
                                                option: string,
                                                optionIndex: () => number,
                                            ) => (
                                                <li class="flex items-center gap-3">
                                                    <span class="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center text-xs text-stone-500">
                                                        {optionLabel(
                                                            optionIndex(),
                                                        )}
                                                    </span>
                                                    <span class="text-stone-700">
                                                        {option || "Option"}
                                                    </span>
                                                </li>
                                            )}
                                        </For>
                                    </ul>
                                )}
                            </Show>
                        </div>
                    );
                }}
            </For>
        </div>
    );
}

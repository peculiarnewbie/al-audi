import { Data } from "effect";
import { normalizeAnswer } from "./schemas";
import type { LiveQuestion, LivePlayerResult, Player } from "./schemas";

/**
 * Tagged errors for Game Engine
 */
export class InvalidQuestion extends Data.TaggedError("InvalidQuestion")<{
    id: string;
    message: string;
}> {}

export class QuestionNotFound extends Data.TaggedError("QuestionNotFound")<{
    id: string;
}> {}

export class NotEnoughOptions extends Data.TaggedError("NotEnoughOptions")<{
    id: string;
    minOptions: number;
}> {}

export class InvalidAnswerFormat extends Data.TaggedError(
    "InvalidAnswerFormat",
)<{
    playerId: string;
    message: string;
}> {}

/**
 * Pure game engine functions - no I/O, testable
 */

export function validateQuestion(
    question: unknown,
): { success: true; value: LiveQuestion } | { success: false; error: string } {
    if (
        !question ||
        typeof question !== "object" ||
        Array.isArray(question)
    ) {
        return { success: false, error: "Invalid question payload." };
    }

    const obj = question as Record<string, unknown>;

    if (!obj.id || typeof obj.id !== "string") {
        return { success: false, error: "Missing question ID." };
    }

    if (!obj.prompt || typeof obj.prompt !== "string") {
        return { success: false, error: "Missing prompt." };
    }

    if (
        !Array.isArray(obj.options) ||
        obj.options.length < 2 ||
        !obj.options.every((o) => typeof o === "string")
    ) {
        return { success: false, error: "Not enough options." };
    }

    if (!obj.correctAnswer || typeof obj.correctAnswer !== "string") {
        return { success: false, error: "Missing correct answer." };
    }

    return {
        success: true,
        value: obj as unknown as LiveQuestion,
    };
}

export function validateAnswer(
    answer: unknown,
): { success: true; value: { questionId: string; answer: string } } | {
    success: false;
    error: string;
} {
    if (
        !answer ||
        typeof answer !== "object" ||
        Array.isArray(answer)
    ) {
        return { success: false, error: "Invalid answer payload." };
    }

    const obj = answer as Record<string, unknown>;

    if (!obj.questionId || typeof obj.questionId !== "string") {
        return { success: false, error: "Missing question ID." };
    }

    if (!obj.answer || typeof obj.answer !== "string") {
        return { success: false, error: "Missing answer." };
    }

    return {
        success: true,
        value: {
            questionId: obj.questionId,
            answer: obj.answer,
        },
    };
}

export function calculateScore(
    answers: Record<string, string | null>,
    questions: Record<string, LiveQuestion>,
): number {
    let score = 0;

    for (const questionId of Object.keys(questions)) {
        const question = questions[questionId];
        const playerAnswer = answers[questionId] ?? null;

        if (
            playerAnswer &&
            normalizeAnswer(playerAnswer) ===
                normalizeAnswer(question.correctAnswer)
        ) {
            score += 1;
        }
    }

    return score;
}

export function getResults(
    players: Player[],
    questions: Record<string, LiveQuestion>,
    answers: Record<string, Record<string, string>>,
): LivePlayerResult[] {
    const questionIds = Object.keys(questions);
    const maxScore = questionIds.length;

    return players.map((player) => {
        let score = 0;
        const playerAnswers: Record<string, string | null> = {};

        for (const questionId of questionIds) {
            const answer = answers[questionId]?.[player.id] ?? null;
            playerAnswers[questionId] = answer;

            const question = questions[questionId];
            const isCorrect = answer
                ? normalizeAnswer(answer) ===
                    normalizeAnswer(question.correctAnswer)
                : false;

            if (isCorrect) {
                score += 1;
            }
        }

        return {
            playerId: player.id,
            playerName: player.name,
            score,
            maxScore,
            answers: playerAnswers,
        };
    });
}

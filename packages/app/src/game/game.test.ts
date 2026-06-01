import { describe, it, expect } from "vitest";
import {
    validateQuestion,
    calculateScore,
    getResults,
    validateAnswer,
} from "./engine";

describe("Game Engine - Question Validation", () => {
    it("validates a valid multiple-choice question", async () => {
        const question = {
            id: "q1",
            prompt: "What is 2 + 2?",
            options: ["1", "2", "3", "4"],
            correctAnswer: "4",
        };

        const result = validateQuestion(question);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.id).toBe("q1");
            expect(result.value.prompt).toBe("What is 2 + 2?");
            expect(result.value.options.length).toBe(4);
            expect(result.value.correctAnswer).toBe("4");
        }
    });

    it("returns error for missing ID", async () => {
        const question = {
            prompt: "What is 2 + 2?",
            options: ["1", "2", "3", "4"],
            correctAnswer: "4",
        };

        const result = validateQuestion(question);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain("Missing question ID");
        }
    });

    it("returns error for not enough options", async () => {
        const question = {
            id: "q1",
            prompt: "What is 2 + 2?",
            options: ["1"],
            correctAnswer: "2",
        };

        const result = validateQuestion(question);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain("Not enough options");
        }
    });
});

describe("Game Engine - Answer Validation", () => {
    it("validates a valid answer", async () => {
        const answer = {
            questionId: "q1",
            answer: "4",
        };

        const result = validateAnswer(answer);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.value.questionId).toBe("q1");
            expect(result.value.answer).toBe("4");
        }
    });

    it("returns error for missing questionId", async () => {
        const answer = {
            answer: "4",
        };

        const result = validateAnswer(answer);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toContain("Missing question ID");
        }
    });
});

describe("Game Engine - Score Calculation", () => {
    it("calculates correct score", async () => {
        const answers = {
            "q1": "4",
            "q2": "2",
            "q3": null,
        };

        const questions: Record<string, any> = {
            "q1": { id: "q1", prompt: "What is 2 + 2?", correctAnswer: "4" },
            "q2": { id: "q2", prompt: "What is 1 + 1?", correctAnswer: "2" },
            "q3": { id: "q3", prompt: "What is 1 + 1?", correctAnswer: "2" },
        };

        const score = calculateScore(answers, questions);
        expect(score).toBe(2);
    });

    it("handles null answers", async () => {
        const answers = {
            "q1": "4",
            "q2": null,
        };

        const questions: Record<string, any> = {
            "q1": { id: "q1", prompt: "What is 2 + 2?", correctAnswer: "4" },
            "q2": { id: "q2", prompt: "What is 1 + 1?", correctAnswer: "2" },
        };

        const score = calculateScore(answers, questions);
        expect(score).toBe(1);
    });
});

describe("Game Engine - Results", () => {
    it("calculates player results", async () => {
        const players = [
            { id: "player1", name: "Alice" },
            { id: "player2", name: "Bob" },
        ];

        const questions: Record<string, any> = {
            "q1": { id: "q1", prompt: "What is 2 + 2?", correctAnswer: "4" },
        };

        const answers = {
            "q1": {
                "player1": "4",
                "player2": "3",
            },
        };

        const results = getResults(players, questions, answers);
        expect(results.length).toBe(2);
        expect(results[0].playerName).toBe("Alice");
        expect(results[0].score).toBe(1);
        expect(results[1].score).toBe(0);
    });
});

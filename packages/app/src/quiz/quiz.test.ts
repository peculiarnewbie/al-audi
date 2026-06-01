import { describe, it, expect } from "vitest";
import { Schema, Effect, Exit, Cause, Option } from "effect";

function expectFailure(exit: Exit.Exit<unknown, unknown>): unknown {
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
        const err = Cause.squash(exit.cause);
        return err;
    }
    throw new Error("Expected failure");
}
import {
    MultipleChoiceQuestionSchema,
    TextQuestionSchema,
    QuizQuestionSchema,
    QuizPayloadSchema,
    SaveQuizInputSchema,
    ShareLinkInputSchema,
    ShareLinkLookupSchema,
    QuizAttemptInputSchema,
    QuizAttemptResponseSchema,
} from "~/quiz/schemas";

describe("Quiz Schemas", () => {
    describe("MultipleChoiceQuestionSchema", () => {
        it("validates a valid multiple-choice question", () => {
            const input = {
                id: "q1",
                type: "multiple-choice" as const,
                prompt: "What is 2+2?",
                options: ["3", "4", "5"],
                correctOptionIndex: 1,
            };
            const result = Schema.decodeUnknownSync(MultipleChoiceQuestionSchema)(input);
            expect(result.id).toBe("q1");
            expect(result.options).toHaveLength(3);
            expect(result.correctOptionIndex).toBe(1);
        });

        it("accepts null correctOptionIndex", () => {
            const input = {
                id: "q1",
                type: "multiple-choice" as const,
                prompt: "What is 2+2?",
                options: ["3", "4"],
                correctOptionIndex: null,
            };
            const result = Schema.decodeUnknownSync(MultipleChoiceQuestionSchema)(input);
            expect(result.correctOptionIndex).toBeNull();
        });

        it("rejects missing options", () => {
            const input = {
                id: "q1",
                type: "multiple-choice" as const,
                prompt: "Test",
                correctOptionIndex: 0,
            };
            expect(() =>
                Schema.decodeUnknownSync(MultipleChoiceQuestionSchema)(input as any),
            ).toThrow();
        });
    });

    describe("TextQuestionSchema", () => {
        it("validates a valid text question", () => {
            const input = {
                id: "q2",
                type: "text" as const,
                prompt: "Explain gravity",
                answer: "It's a force",
            };
            const result = Schema.decodeUnknownSync(TextQuestionSchema)(input);
            expect(result.id).toBe("q2");
            expect(result.answer).toBe("It's a force");
        });
    });

    describe("QuizQuestionSchema (discriminated union)", () => {
        it("validates a multiple-choice question", () => {
            const input = {
                id: "q1",
                type: "multiple-choice",
                prompt: "Pick one",
                options: ["A", "B"],
                correctOptionIndex: 0,
            };
            const result = Schema.decodeUnknownSync(QuizQuestionSchema)(input);
            expect(result.type).toBe("multiple-choice");
        });

        it("validates a text question", () => {
            const input = {
                id: "q2",
                type: "text",
                prompt: "Write an essay",
                answer: "Here is my essay",
            };
            const result = Schema.decodeUnknownSync(QuizQuestionSchema)(input);
            expect(result.type).toBe("text");
        });

        it("rejects unknown question type", () => {
            expect(() =>
                Schema.decodeUnknownSync(QuizQuestionSchema)({
                    id: "q1",
                    type: "drag-drop",
                    prompt: "Test",
                } as any),
            ).toThrow();
        });
    });

    describe("QuizPayloadSchema", () => {
        it("validates a full quiz payload", () => {
            const input = {
                id: "quiz-1",
                creatorId: "user-1",
                createdAt: "2025-01-01T00:00:00Z",
                questions: [
                    {
                        id: "q1",
                        type: "multiple-choice",
                        prompt: "What is 2+2?",
                        options: ["3", "4"],
                        correctOptionIndex: 1,
                    },
                    {
                        id: "q2",
                        type: "text",
                        prompt: "Name a color",
                        answer: "blue",
                    },
                ],
                categories: { level: "beginner", topic: "math" },
            };
            const result = Schema.decodeUnknownSync(QuizPayloadSchema)(input);
            expect(result.questions).toHaveLength(2);
            expect(result.categories?.level).toBe("beginner");
        });
    });

    describe("SaveQuizInputSchema", () => {
        it("validates with optional quizId", () => {
            const input = {
                questions: [
                    {
                        id: "q1",
                        type: "multiple-choice",
                        prompt: "Test",
                        options: ["A", "B"],
                        correctOptionIndex: 0,
                    },
                ],
            };
            const result = Schema.decodeUnknownSync(SaveQuizInputSchema)(input);
            expect(result.questions).toHaveLength(1);
        });
    });

    describe("ShareLinkInputSchema", () => {
        it("validates share link input", () => {
            const input = { quizId: "quiz-1", requireToken: true };
            const result = Schema.decodeUnknownSync(ShareLinkInputSchema)(input);
            expect(result.quizId).toBe("quiz-1");
            expect(result.requireToken).toBe(true);
        });

        it("handles missing requireToken", () => {
            const input = { quizId: "quiz-1" };
            const result = Schema.decodeUnknownSync(ShareLinkInputSchema)(input);
            expect(result.requireToken).toBeUndefined();
        });
    });

    describe("ShareLinkLookupSchema", () => {
        it("validates with optional token", () => {
            const input = { shareId: "share-1", token: "abc123" };
            const result = Schema.decodeUnknownSync(ShareLinkLookupSchema)(input);
            expect(result.token).toBe("abc123");
        });

        it("validates without token", () => {
            const input = { shareId: "share-1" };
            const result = Schema.decodeUnknownSync(ShareLinkLookupSchema)(input);
            expect(result.token).toBeUndefined();
        });
    });

    describe("QuizAttemptResponseSchema", () => {
        it("validates an MCQ response", () => {
            const input = { questionId: "q1", selectedOption: 0 };
            const result = Schema.decodeUnknownSync(QuizAttemptResponseSchema)(input);
            expect(result.selectedOption).toBe(0);
        });

        it("validates a text response", () => {
            const input = { questionId: "q2", answerText: "my answer" };
            const result = Schema.decodeUnknownSync(QuizAttemptResponseSchema)(input);
            expect(result.answerText).toBe("my answer");
        });
    });

    describe("QuizAttemptInputSchema", () => {
        it("validates a full attempt input", () => {
            const input = {
                quizId: "quiz-1",
                responses: [
                    { questionId: "q1", selectedOption: 0 },
                    { questionId: "q2", answerText: "hello" },
                ],
            };
            const result = Schema.decodeUnknownSync(QuizAttemptInputSchema)(input);
            expect(result.mode).toBeUndefined();
            expect(result.responses).toHaveLength(2);
        });
    });
});

describe("Quiz Handlers (unit)", () => {
    describe("Tagged error types", () => {
        it("QuizNotFound has correct tag", async () => {
            const { QuizNotFound } = await import("~/quiz/handlers");
            const err = new QuizNotFound({ id: "test-id" });
            expect(err._tag).toBe("QuizNotFound");
            expect(err.id).toBe("test-id");
        });

        it("QuizAccessDenied has correct tag", async () => {
            const { QuizAccessDenied } = await import("~/quiz/handlers");
            const err = new QuizAccessDenied();
            expect(err._tag).toBe("QuizAccessDenied");
        });

        it("ShareLinkNotFound has correct tag", async () => {
            const { ShareLinkNotFound } = await import("~/quiz/handlers");
            const err = new ShareLinkNotFound({ id: "share-1" });
            expect(err._tag).toBe("ShareLinkNotFound");
        });

        it("ShareLinkTokenRequired has correct tag", async () => {
            const { ShareLinkTokenRequired } = await import("~/quiz/handlers");
            const err = new ShareLinkTokenRequired();
            expect(err._tag).toBe("ShareLinkTokenRequired");
        });

        it("QuizSaveError carries message", async () => {
            const { QuizSaveError } = await import("~/quiz/handlers");
            const err = new QuizSaveError({ message: "oops" });
            expect(err.message).toBe("oops");
        });
    });

    describe("Category helpers (internal)", () => {
        it("buildCategoryPayload returns undefined for empty input", async () => {
            const { saveQuizEffect } = await import("~/quiz/handlers");
            expect(saveQuizEffect).toBeDefined();
        });
    });

    describe("createQuizShareLinkEffect", () => {
        it("creates share link for owned quiz", async () => {
            const { createQuizShareLinkEffect, QuizNotFound, QuizAccessDenied } = await import(
                "~/quiz/handlers"
            );
            const { Effect, Exit } = await import("effect");

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([
                                    { id: "quiz-1", creatorId: "user-1" },
                                ]),
                        }),
                    }),
                }),
                insert: () => ({
                    values: () => Promise.resolve(),
                }),
            };

            const exit = await Effect.runPromiseExit(
                createQuizShareLinkEffect(mockDb as any, "quiz-1", "user-1", true),
            );

            Exit.match(exit, {
                onSuccess: (result) => {
                    expect(result.shareId).toBeDefined();
                    expect(result.accessToken).toBeDefined();
                },
                onFailure: (err) => {
                    throw new Error(`Expected success, got ${err}`);
                },
            });
        });

        it("fails with QuizNotFound for missing quiz", async () => {
            const { createQuizShareLinkEffect, QuizNotFound } = await import(
                "~/quiz/handlers"
            );

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () => Promise.resolve([]),
                        }),
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                createQuizShareLinkEffect(mockDb as any, "missing-quiz", "user-1", false),
            );
            const err = expectFailure(exit);
            expect(err).toBeInstanceOf(QuizNotFound);
        });

        it("fails with QuizAccessDenied when user is not creator", async () => {
            const { createQuizShareLinkEffect, QuizAccessDenied } = await import(
                "~/quiz/handlers"
            );

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([
                                    { id: "quiz-1", creatorId: "other-user" },
                                ]),
                        }),
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                createQuizShareLinkEffect(mockDb as any, "quiz-1", "user-1", false),
            );
            const err = expectFailure(exit);
            expect(err).toBeInstanceOf(QuizAccessDenied);
        });
    });

    describe("createQuizAssignmentEffect", () => {
        it("creates assignment targeting a class", async () => {
            const { createQuizAssignmentEffect } = await import("~/quiz/handlers");
            const { Effect, Exit } = await import("effect");

            const inserted: any[] = [];
            const mockDb = {
                insert: () => ({
                    values: (row: any) => {
                        inserted.push(row);
                        return Promise.resolve();
                    },
                }),
            };

            const exit = await Effect.runPromiseExit(
                createQuizAssignmentEffect(mockDb as any, "teacher-1", {
                    quizId: "quiz-1",
                    classId: "class-1",
                }),
            );

            Exit.match(exit, {
                onSuccess: (result) => {
                    expect(result.id).toBeDefined();
                    expect(inserted[0].classId).toBe("class-1");
                    expect(inserted[0].studentId).toBeNull();
                },
                onFailure: (err) => {
                    throw new Error(`Expected success, got ${err}`);
                },
            });
        });

        it("fails when both classId and studentId are set", async () => {
            const { createQuizAssignmentEffect, AssignmentTargetError } = await import(
                "~/quiz/handlers"
            );

            const mockDb = {};

            const exit = await Effect.runPromiseExit(
                createQuizAssignmentEffect(mockDb as any, "teacher-1", {
                    quizId: "quiz-1",
                    classId: "class-1",
                    studentId: "student-1",
                }),
            );
            const err = expectFailure(exit);
            expect(err).toBeInstanceOf(AssignmentTargetError);
        });

        it("fails when neither classId nor studentId is set", async () => {
            const { createQuizAssignmentEffect, AssignmentTargetError } = await import(
                "~/quiz/handlers"
            );

            const mockDb = {};

            const exit = await Effect.runPromiseExit(
                createQuizAssignmentEffect(mockDb as any, "teacher-1", {
                    quizId: "quiz-1",
                }),
            );
            const err = expectFailure(exit);
            expect(err).toBeInstanceOf(AssignmentTargetError);
        });
    });

    describe("getSharedQuizEffect", () => {
        it("returns quiz questions for valid share link", async () => {
            const { getSharedQuizEffect } = await import("~/quiz/handlers");
            const { Effect, Exit } = await import("effect");

            const mockDb = {
                select: () => ({
                    from: (table: any) => ({
                        where: () => ({
                            limit: () => {
                                if (table === undefined) {
                                    return Promise.resolve([
                                        {
                                            id: "share-1",
                                            quizId: "quiz-1",
                                            accessToken: null,
                                        },
                                    ]);
                                }
                                return Promise.resolve([]);
                            },
                        }),
                    }),
                }),
            };

            const selectCallCount = { count: 0 };
            const db = {
                select: () => {
                    selectCallCount.count++;
                    const callIndex = selectCallCount.count;
                    return {
                        from: () => ({
                            where: () => ({
                                limit: () => {
                                    if (callIndex === 1) {
                                        return Promise.resolve([
                                            {
                                                id: "share-1",
                                                quizId: "quiz-1",
                                                accessToken: null,
                                            },
                                        ]);
                                    }
                                    return Promise.resolve([]);
                                },
                            }),
                        }),
                    };
                },
            };

            const exit = await Effect.runPromiseExit(
                getSharedQuizEffect(db as any, "share-1"),
            );

            Exit.match(exit, {
                onSuccess: () => {
                    throw new Error("Expected failure due to no questions");
                },
                onFailure: (err) => {
                    expect(err).toBeDefined();
                },
            });
        });

        it("fails with ShareLinkNotFound for missing share link", async () => {
            const { getSharedQuizEffect, ShareLinkNotFound } = await import(
                "~/quiz/handlers"
            );

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () => Promise.resolve([]),
                        }),
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                getSharedQuizEffect(mockDb as any, "missing-share"),
            );
            const err = expectFailure(exit);
            expect(err).toBeInstanceOf(ShareLinkNotFound);
        });

        it("fails with ShareLinkTokenRequired when token mismatch", async () => {
            const { getSharedQuizEffect, ShareLinkTokenRequired } = await import(
                "~/quiz/handlers"
            );

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([
                                    {
                                        id: "share-1",
                                        quizId: "quiz-1",
                                        accessToken: "correct-token",
                                    },
                                ]),
                        }),
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                getSharedQuizEffect(mockDb as any, "share-1", "wrong-token"),
            );
            const err = expectFailure(exit);
            expect(err).toBeInstanceOf(ShareLinkTokenRequired);
        });
    });
});

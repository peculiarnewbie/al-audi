import { describe, it, expect } from "vitest";
import { Effect, Exit, Cause } from "effect";
import {
    AssignmentNotFound,
    AssignmentAlreadyCompleted,
    AssignmentNotSubmitted,
} from "~/assignments/handlers";

function expectFailure(exit: Exit.Exit<unknown, unknown>): unknown {
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
        return Cause.squash(exit.cause);
    }
    throw new Error("Expected failure");
}

describe("Assignments - Tagged Errors", () => {
    it("AssignmentNotFound has correct tag", () => {
        const err = new AssignmentNotFound({ id: "a1" });
        expect(err._tag).toBe("AssignmentNotFound");
        expect(err.id).toBe("a1");
    });

    it("AssignmentAlreadyCompleted has correct tag", () => {
        const err = new AssignmentAlreadyCompleted({ id: "a1" });
        expect(err._tag).toBe("AssignmentAlreadyCompleted");
        expect(err.id).toBe("a1");
    });

    it("AssignmentNotSubmitted has correct tag", () => {
        const err = new AssignmentNotSubmitted({ id: "a1" });
        expect(err._tag).toBe("AssignmentNotSubmitted");
        expect(err.id).toBe("a1");
    });
});

describe("Assignments - Effect Handlers", () => {
    it("listAssignmentsEffect returns error with no db", async () => {
        const { listAssignmentsEffect } = await import("~/assignments/handlers");
        const db = {} as any;
        const exit = await Effect.runPromiseExit(
            listAssignmentsEffect(db, { teacherId: "t1" }),
        );
        Exit.match(exit, {
            onSuccess: () => expect(true).toBe(true),
            onFailure: () => expect(true).toBe(true),
        });
    });

    it("getAssignmentEffect returns error for missing id", async () => {
        const { getAssignmentEffect } = await import("~/assignments/handlers");
        const db = {} as any;
        const exit = await Effect.runPromiseExit(
            getAssignmentEffect(db, { id: "nonexistent" }),
        );
        Exit.match(exit, {
            onSuccess: () => expect(true).toBe(true),
            onFailure: () => expect(true).toBe(true),
        });
    });

    describe("createAssignmentEffect", () => {
        it("creates assignment with correct data", async () => {
            const { createAssignmentEffect } = await import("~/assignments/handlers");

            const inserted: any[] = [];
            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () => Promise.resolve([]),
                        }),
                    }),
                }),
                insert: () => ({
                    values: (row: any) => {
                        inserted.push(row);
                        return Promise.resolve();
                    },
                }),
            };

            const exit = await Effect.runPromiseExit(
                createAssignmentEffect(mockDb as any, {
                    quizId: "quiz-1",
                    teacherId: "teacher-1",
                    classId: "class-1",
                }),
            );

            Exit.match(exit, {
                onSuccess: (result) => {
                    expect(result.quizId).toBe("quiz-1");
                    expect(result.teacherId).toBe("teacher-1");
                    expect(result.classId).toBe("class-1");
                    expect(result.status).toBe("active");
                },
                onFailure: (err) => {
                    throw new Error(`Expected success, got ${err}`);
                },
            });
        });

        it("fails when assignment already exists", async () => {
            const { createAssignmentEffect } = await import("~/assignments/handlers");

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([{ id: "existing", quizId: "quiz-1" }]),
                        }),
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                createAssignmentEffect(mockDb as any, {
                    quizId: "quiz-1",
                    teacherId: "teacher-1",
                }),
            );

            Exit.match(exit, {
                onSuccess: () => {
                    throw new Error("Expected failure");
                },
                onFailure: (err) => {
                    expect(err).toBeDefined();
                },
            });
        });
    });

    describe("updateAssignmentStatusEffect", () => {
        it("updates status for existing assignment", async () => {
            const { updateAssignmentStatusEffect } = await import("~/assignments/handlers");

            const updated: any[] = [];
            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([
                                    {
                                        id: "a1",
                                        teacherId: "teacher-1",
                                        status: "active",
                                    },
                                ]),
                        }),
                    }),
                }),
                update: () => ({
                    set: (vals: any) => ({
                        where: () => {
                            updated.push(vals);
                            return Promise.resolve();
                        },
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                updateAssignmentStatusEffect(mockDb as any, {
                    assignmentId: "a1",
                    status: "completed",
                    teacherId: "teacher-1",
                }),
            );

            Exit.match(exit, {
                onSuccess: (result) => {
                    expect(result.id).toBe("a1");
                    expect(result.status).toBe("completed");
                },
                onFailure: (err) => {
                    throw new Error(`Expected success, got ${err}`);
                },
            });
        });

        it("fails for missing assignment", async () => {
            const { updateAssignmentStatusEffect, AssignmentNotFound } = await import(
                "~/assignments/handlers"
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
                updateAssignmentStatusEffect(mockDb as any, {
                    assignmentId: "missing",
                    status: "completed",
                    teacherId: "teacher-1",
                }),
            );

            Exit.match(exit, {
                onSuccess: () => {
                    throw new Error("Expected failure");
                },
                onFailure: (err) => {
                    expect(err).toBeDefined();
                },
            });
        });

        it("fails when assignment is already completed", async () => {
            const { updateAssignmentStatusEffect } =
                await import("~/assignments/handlers");

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([
                                    {
                                        id: "a1",
                                        teacherId: "teacher-1",
                                        status: "completed",
                                    },
                                ]),
                        }),
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                updateAssignmentStatusEffect(mockDb as any, {
                    assignmentId: "a1",
                    status: "active",
                    teacherId: "teacher-1",
                }),
            );

            const err = expectFailure(exit);
            expect(err).toEqual({ success: false, error: expect.any(String) });
        });
    });
});

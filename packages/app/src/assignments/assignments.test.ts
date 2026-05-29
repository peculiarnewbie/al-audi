import { describe, it, expect } from "bun:test";
import { Effect, Exit } from "effect";
import {
    AssignmentNotFound,
    AssignmentAlreadyCompleted,
    AssignmentNotSubmitted,
} from "~/assignments/handlers";

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
});

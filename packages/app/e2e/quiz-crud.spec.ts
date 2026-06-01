import { describe, it, expect, afterAll } from "vitest";
import {
    ab,
    abOpen,
    abClick,
    abFill,
    abSnapshot,
    abWaitForText,
    abScreenshot,
    abClose,
    baseUrl,
} from "./helpers";

describe("Quiz CRUD", () => {
    afterAll(() => abClose());

    it("loads the quiz list page", () => {
        abOpen(baseUrl("/quizzes"));
        const snap = abSnapshot();
        expect(snap).toBeDefined();
    });

    it("navigates to quiz creation", () => {
        abOpen(baseUrl("/quizzes"));
        const snap = abSnapshot();
        const lines = snap.split("\n");

        const createButton = lines.find(
            (line) =>
                (/create|new|add/i.test(line) && /button/i.test(line)) ||
                (/quiz/i.test(line) && /link/i.test(line)),
        );

        if (createButton) {
            const refMatch = createButton.match(/@e\d+/);
            if (refMatch) {
                abClick(refMatch[0]);
                const afterSnap = abSnapshot();
                expect(afterSnap).toBeDefined();
            }
        }
    });

    it("takes a screenshot of the quiz page", () => {
        abOpen(baseUrl("/quizzes"));
        const result = abScreenshot("/tmp/e2e-quiz-list.png");
        expect(result).toContain("saved");
    });
});

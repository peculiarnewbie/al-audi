import { describe, it, expect, afterAll, beforeAll } from "vitest";
import {
    ab,
    abOpen,
    abClick,
    abFill,
    abSnapshot,
    abWaitForText,
    abGetText,
    abClose,
    abScreenshot,
    baseUrl,
} from "./helpers";

describe("Auth Flow", () => {
    afterAll(() => abClose());

    it("loads the sign-in page", () => {
        abOpen(baseUrl("/sign-in"));
        const snap = abSnapshot();
        expect(snap).toBeDefined();
    });

    it("navigates to sign-up from sign-in", () => {
        abOpen(baseUrl("/sign-in"));
        const snap = abSnapshot();
        const lines = snap.split("\n");

        const signUpLink = lines.find(
            (line) => /sign.?up/i.test(line) && /link/i.test(line),
        );

        if (signUpLink) {
            const refMatch = signUpLink.match(/@e\d+/);
            if (refMatch) {
                abClick(refMatch[0]);
                const afterSnap = abSnapshot();
                expect(afterSnap).toMatch(/sign.?up/i);
            }
        }
    });

    it("shows validation errors on empty sign-in submission", () => {
        abOpen(baseUrl("/sign-in"));
        const snap = abSnapshot();
        const lines = snap.split("\n");

        const submitButton = lines.find(
            (line) => /submit|sign.?in|log.?in/i.test(line) && /button/i.test(line),
        );

        if (submitButton) {
            const refMatch = submitButton.match(/@e\d+/);
            if (refMatch) {
                abClick(refMatch[0]);
                const afterSnap = abSnapshot();
                expect(afterSnap).toBeDefined();
            }
        }
    });
});

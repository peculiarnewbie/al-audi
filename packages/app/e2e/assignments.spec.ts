import { describe, it, expect, afterAll } from "vitest";
import {
    ab,
    abOpen,
    abClick,
    abFill,
    abSnapshot,
    abScreenshot,
    abClose,
    baseUrl,
} from "./helpers";

describe("Assignments", () => {
    afterAll(() => abClose());

    it("loads the assignments page", () => {
        abOpen(baseUrl("/assignments"));
        const snap = abSnapshot();
        expect(snap).toBeDefined();
    });

    it("shows assignment list or empty state", () => {
        abOpen(baseUrl("/assignments"));
        const snap = abSnapshot();
        const hasContent =
            snap.includes("assignment") ||
            snap.includes("Assignment") ||
            snap.includes("empty") ||
            snap.includes("No ");
        expect(hasContent).toBe(true);
    });

    it("takes a screenshot of assignments", () => {
        abOpen(baseUrl("/assignments"));
        const result = abScreenshot("/tmp/e2e-assignments.png");
        expect(result).toContain("saved");
    });
});

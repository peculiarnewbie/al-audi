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

describe("Drive", () => {
    afterAll(() => abClose());

    it("loads the drive page", () => {
        abOpen(baseUrl("/drive"));
        const snap = abSnapshot();
        expect(snap).toBeDefined();
    });

    it("shows folder list or empty state", () => {
        abOpen(baseUrl("/drive"));
        const snap = abSnapshot();
        const hasContent =
            snap.includes("folder") ||
            snap.includes("Folder") ||
            snap.includes("drive") ||
            snap.includes("upload") ||
            snap.includes("empty") ||
            snap.includes("No ");
        expect(hasContent).toBe(true);
    });

    it("takes a screenshot of drive", () => {
        abOpen(baseUrl("/drive"));
        const result = abScreenshot("/tmp/e2e-drive.png");
        expect(result).toContain("saved");
    });
});

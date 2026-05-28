import { describe, it, expect } from "bun:test";
import { DriveNotFound, FolderNotFound, FileNotFound, FileSizeExceeded, PermissionDenied } from "~/drive/handlers";

/**
 * Test Drive error types
 */
describe("Drive Error Types", () => {
    it("DriveNotFound has correct tag", () => {
        const err = new DriveNotFound();
        expect(err._tag).toBe("DriveNotFound");
    });

    it("FolderNotFound has correct tag", () => {
        const err = new FolderNotFound({ id: "folder-1" });
        expect(err._tag).toBe("FolderNotFound");
        expect(err.id).toBe("folder-1");
    });

    it("FileNotFound has correct tag", () => {
        const err = new FileNotFound({ id: "file-1" });
        expect(err._tag).toBe("FileNotFound");
        expect(err.id).toBe("file-1");
    });

    it("FileSizeExceeded has correct tag", () => {
        const err = new FileSizeExceeded();
        expect(err._tag).toBe("FileSizeExceeded");
    });

    it("PermissionDenied has correct tag", () => {
        const err = new PermissionDenied();
        expect(err._tag).toBe("PermissionDenied");
    });
});

describe("DateTime helpers", () => {
    it("Date.now() returns a number", () => {
        const now = Date.now();
        expect(typeof now).toBe("number");
        expect(now).toBeGreaterThan(0);
        expect(now).toBeGreaterThan(Date.now() - 1000); // within last millisecond
    });
});

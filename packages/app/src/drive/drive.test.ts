import { describe, it, expect } from "vitest";
import { Effect, Exit, Cause } from "effect";
import { DriveNotFound, FolderNotFound, FileNotFound, FileSizeExceeded, PermissionDenied } from "~/drive/handlers";

function expectFailure(exit: Exit.Exit<unknown, unknown>): unknown {
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
        return Cause.squash(exit.cause);
    }
    throw new Error("Expected failure");
}

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

describe("Drive Effect Handlers", () => {
    describe("createFolderEffect", () => {
        it("creates folder with valid input", async () => {
            const { createFolderEffect } = await import("~/drive/handlers");
            const { Effect, Exit } = await import("effect");

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () => Promise.resolve([]),
                        }),
                    }),
                }),
                insert: () => ({
                    values: () => Promise.resolve(),
                }),
            };

            const exit = await Effect.runPromiseExit(
                createFolderEffect(mockDb as any, { name: "My Folder" }),
            );

            Exit.match(exit, {
                onSuccess: (result) => {
                    expect(result.name).toBe("My Folder");
                    expect(result.id).toBeDefined();
                },
                onFailure: (err) => {
                    throw new Error(`Expected success, got ${err}`);
                },
            });
        });

        it("fails when folder name already exists", async () => {
            const { createFolderEffect } = await import("~/drive/handlers");
            const { Effect, Exit } = await import("effect");

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([{ id: "existing", name: "My Folder" }]),
                        }),
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                createFolderEffect(mockDb as any, { name: "My Folder" }),
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

    describe("deleteFileEffect", () => {
        it("deletes existing file", async () => {
            const { deleteFileEffect } = await import("~/drive/handlers");
            const { Effect, Exit } = await import("effect");

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([{ id: "file-1", fileName: "test.pdf" }]),
                        }),
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                deleteFileEffect(mockDb as any, { fileId: "file-1" }),
            );

            Exit.match(exit, {
                onSuccess: (result) => {
                    expect(result.id).toBe("file-1");
                    expect(result.deleted).toBe(true);
                },
                onFailure: (err) => {
                    throw new Error(`Expected success, got ${err}`);
                },
            });
        });

        it("fails for missing file", async () => {
            const { deleteFileEffect, FileNotFound } = await import("~/drive/handlers");
            const { Effect, Exit } = await import("effect");

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
                deleteFileEffect(mockDb as any, { fileId: "missing" }),
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

    describe("createFileEffect", () => {
        it("rejects files exceeding size limit", async () => {
            const { createFileEffect } = await import("~/drive/handlers");

            const mockDb = {};
            const mockBucket = {
                put: async () => {},
                delete: async () => {},
            };

            const exit = await Effect.runPromiseExit(
                createFileEffect(mockDb as any, mockBucket as any, {
                    name: "huge.bin",
                    mimeType: "application/octet-stream",
                    size: 200 * 1024 * 1024,
                    fileData: new Blob([]),
                }),
            );

            const err = expectFailure(exit);
            expect(err).toEqual({ success: false, error: expect.any(String) });
        });

        it("uploads file within size limit", async () => {
            const { createFileEffect } = await import("~/drive/handlers");
            const { Effect, Exit } = await import("effect");

            const putCalls: any[] = [];
            const mockDb = {
                insert: () => ({
                    values: () => Promise.resolve(),
                }),
            };
            const mockBucket = {
                put: async (...args: any[]) => {
                    putCalls.push(args);
                },
                delete: async () => {},
            };

            const exit = await Effect.runPromiseExit(
                createFileEffect(mockDb as any, mockBucket as any, {
                    name: "test.txt",
                    mimeType: "text/plain",
                    size: 100,
                    fileData: new Blob(["hello"]),
                }),
            );

            Exit.match(exit, {
                onSuccess: (result) => {
                    expect(result.name).toBe("test.txt");
                    expect(result.mimeType).toBe("text/plain");
                    expect(putCalls).toHaveLength(1);
                },
                onFailure: (err) => {
                    throw new Error(`Expected success, got ${err}`);
                },
            });
        });
    });

    describe("setFolderPermissionsEffect", () => {
        it("sets permissions on owned folder", async () => {
            const { setFolderPermissionsEffect } = await import("~/drive/handlers");
            const { Effect, Exit } = await import("effect");

            const inserted: any[] = [];
            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([
                                    { id: "folder-1", teacherId: "teacher-1" },
                                ]),
                        }),
                    }),
                }),
                delete: () => ({
                    where: () => Promise.resolve(),
                }),
                insert: () => ({
                    values: (rows: any) => {
                        inserted.push(...(Array.isArray(rows) ? rows : [rows]));
                        return Promise.resolve();
                    },
                }),
            };

            const exit = await Effect.runPromiseExit(
                setFolderPermissionsEffect(
                    mockDb as any,
                    "folder-1",
                    "teacher-1",
                    { classIds: ["class-1"], studentIds: ["student-1"] },
                ),
            );

            Exit.match(exit, {
                onSuccess: (result) => {
                    expect(result.classIds).toEqual(["class-1"]);
                    expect(result.studentIds).toEqual(["student-1"]);
                },
                onFailure: (err) => {
                    throw new Error(`Expected success, got ${err}`);
                },
            });
        });

        it("fails when folder not found", async () => {
            const { setFolderPermissionsEffect, FolderNotFound } = await import(
                "~/drive/handlers"
            );
            const { Effect, Exit } = await import("effect");

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
                setFolderPermissionsEffect(mockDb as any, "missing", "teacher-1", {
                    classIds: [],
                    studentIds: [],
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

        it("fails with PermissionDenied for non-owner", async () => {
            const { setFolderPermissionsEffect } = await import(
                "~/drive/handlers"
            );

            const mockDb = {
                select: () => ({
                    from: () => ({
                        where: () => ({
                            limit: () =>
                                Promise.resolve([
                                    { id: "folder-1", teacherId: "other-teacher" },
                                ]),
                        }),
                    }),
                }),
            };

            const exit = await Effect.runPromiseExit(
                setFolderPermissionsEffect(
                    mockDb as any,
                    "folder-1",
                    "teacher-1",
                    { classIds: [], studentIds: [] },
                ),
            );

            const err = expectFailure(exit);
            expect(err).toEqual({ success: false, error: expect.any(String) });
        });
    });
});

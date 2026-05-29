import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show, createResource, createMemo } from "solid-js";
import { createServerFn } from "@tanstack/solid-start";
import { getDriveAssets, listFolders, getFolderPermissions, setFolderPermissions } from "~/server/drive";
import type { DriveAsset } from "~/server/drive";
import type { ClassroomDetail, ClassroomStudent } from "~/server/classrooms";

type FolderItem = { id: string; name: string };

const fetchClassrooms = createServerFn({ method: "GET" }).handler(async () => {
    const { getRequestHeaders } = await import("@tanstack/solid-start/server");
    const { getTeacherClassrooms: fn } = await import("~/server/classrooms");
    return fn(getRequestHeaders());
});

const fetchStudents = createServerFn({ method: "GET" })
    .inputValidator((data: { search?: string }) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        const { getTeacherStudents: fn } = await import("~/server/classrooms");
        return fn(getRequestHeaders(), data.search);
    });

export const Route = createFileRoute("/dashboard/drive")({
    component: DrivePage,
});

function DrivePage() {
    const [selectedFolderId, setSelectedFolderId] = createSignal<string | null>(null);
    const [permFolderId, setPermFolderId] = createSignal<string | null>(null);
    const [permClassIds, setPermClassIds] = createSignal<string[]>([]);
    const [permStudentIds, setPermStudentIds] = createSignal<string[]>([]);
    const [saving, setSaving] = createSignal(false);
    const [studentSearch, setStudentSearch] = createSignal("");

    const [foldersData, { refetch: refetchFolders }] = createResource(() => listFolders({ data: {} as any }));
    const [classroomsData] = createResource(() => fetchClassrooms({ data: {} as any }));
    const [studentsData] = createResource(
        () => studentSearch(),
        (search) => fetchStudents({ data: { search: search || undefined } }),
    );

    const folders = createMemo((): FolderItem[] => {
        const d = foldersData();
        if (!d || !d.success) return [];
        return d.folders.map((f: any) => ({ id: f.id, name: f.name }));
    });

    const classrooms = createMemo((): { id: string; name: string }[] => {
        const d = classroomsData();
        if (!d || d.status !== "ok") return [];
        return d.classrooms.map((c: ClassroomDetail) => ({ id: c.id, name: c.name }));
    });

    const students = createMemo((): { id: string; name: string }[] => {
        const d = studentsData();
        if (!d || d.status !== "ok") return [];
        return d.students.map((s: ClassroomStudent) => ({ id: s.id, name: s.name }));
    });

    const selectedFolder = createMemo((): FolderItem | undefined => folders().find((f) => f.id === permFolderId()));

    const openPermissions = async (folderId: string) => {
        setPermFolderId(folderId);
        const result = await getFolderPermissions({ data: { folderId } });
        if (result.success) {
            setPermClassIds(result.classIds);
            setPermStudentIds(result.studentIds);
        } else {
            setPermClassIds([]);
            setPermStudentIds([]);
        }
    };

    const toggleClass = (classId: string) => {
        setPermClassIds((prev) =>
            prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
        );
    };

    const toggleStudent = (studentId: string) => {
        setPermStudentIds((prev) =>
            prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
        );
    };

    const savePermissions = async () => {
        const folderId = permFolderId();
        if (!folderId) return;
        setSaving(true);
        const result = await setFolderPermissions({
            data: { folderId, classIds: permClassIds(), studentIds: permStudentIds() },
        });
        setSaving(false);
        if (result.success) {
            setPermFolderId(null);
            refetchFolders();
        }
    };

    return (
        <div class="mx-auto max-w-5xl px-6 py-12 space-y-8">
            <header class="space-y-2">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Dashboard
                </div>
                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                    Drive
                </h1>
                <p class="text-sm text-slate-600">
                    Manage your folders and set who can see them.
                </p>
            </header>

            <Show
                when={folders().length}
                fallback={
                    <div class="rounded-3xl border border-white/70 bg-white/80 p-6 text-sm text-slate-600 shadow-sm">
                        No folders yet.
                    </div>
                }
            >
                <div class="grid gap-4 md:grid-cols-2">
                    <For each={folders()}>
                        {(folder) => (
                            <div class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                                <div class="flex items-start justify-between gap-4">
                                    <div>
                                        <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                            Folder
                                        </div>
                                        <div class="mt-2 text-lg font-semibold text-[color:var(--dashboard-ink)]">
                                            {folder.name}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => openPermissions(folder.id)}
                                        class="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-white"
                                    >
                                        Permissions
                                    </button>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            <Show when={permFolderId() && selectedFolder()}>
                <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm p-4">
                    <div class="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-xl space-y-6">
                        <div class="flex items-start justify-between">
                            <div>
                                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                    Folder permissions
                                </div>
                                <div class="mt-1 text-xl font-semibold text-[color:var(--dashboard-ink)]">
                                    {selectedFolder()!.name}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPermFolderId(null)}
                                class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500"
                            >
                                Close
                            </button>
                        </div>

                        <div class="space-y-3">
                            <div class="text-sm font-semibold text-slate-700">
                                Share with classes
                            </div>
                            <Show
                                when={classrooms().length}
                                fallback={
                                    <div class="text-sm text-slate-500">No classrooms yet.</div>
                                }
                            >
                                <div class="space-y-2 max-h-40 overflow-y-auto">
                                    <For each={classrooms()}>
                                        {(cls) => (
                                            <label class="flex items-center gap-3 text-sm text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    checked={permClassIds().includes(cls.id)}
                                                    onChange={() => toggleClass(cls.id)}
                                                />
                                                <span>{cls.name}</span>
                                            </label>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>

                        <div class="space-y-3">
                            <div class="text-sm font-semibold text-slate-700">
                                Share with individual students
                            </div>
                            <input
                                type="text"
                                value={studentSearch()}
                                onInput={(e) => setStudentSearch(e.currentTarget.value)}
                                placeholder="Search students..."
                                class="w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700"
                            />
                            <Show
                                when={students().length}
                                fallback={
                                    <div class="text-sm text-slate-500">
                                        {studentSearch() ? "No students match." : "Type to search students."}
                                    </div>
                                }
                            >
                                <div class="space-y-2 max-h-40 overflow-y-auto">
                                    <For each={students()}>
                                        {(student) => (
                                            <label class="flex items-center gap-3 text-sm text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    checked={permStudentIds().includes(student.id)}
                                                    onChange={() => toggleStudent(student.id)}
                                                />
                                                <span>{student.name}</span>
                                            </label>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>

                        <div class="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={savePermissions}
                                disabled={saving()}
                                class="rounded-full bg-[color:var(--dashboard-accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-60"
                            >
                                {saving() ? "Saving..." : "Save permissions"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPermFolderId(null)}
                                class="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}

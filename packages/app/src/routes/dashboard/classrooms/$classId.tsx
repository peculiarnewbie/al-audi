import { createFileRoute, redirect, useRouter } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { For, Show, createResource, createSignal } from "solid-js";
import type {
    ClassroomDetail,
    ClassroomStudent,
} from "~/server/classrooms";

const fetchClassroom = createServerFn({ method: "GET" })
    .inputValidator((data: { classId: string }) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        const { getClassroom: fn } = await import("~/server/classrooms");
        return fn(getRequestHeaders(), data.classId);
    });

const updateClassroom = createServerFn({ method: "POST" })
    .inputValidator(
        (data: { classId: string; name?: string; description?: string | null }) =>
            data,
    )
    .handler(async ({ data }) => {
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        const { updateClassroom: fn } = await import("~/server/classrooms");
        return fn(getRequestHeaders(), data.classId, {
            name: data.name,
            description: data.description,
        });
    });

const deleteClassroom = createServerFn({ method: "POST" })
    .inputValidator((data: { classId: string }) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        const { deleteClassroom: fn } = await import("~/server/classrooms");
        return fn(getRequestHeaders(), data.classId);
    });

const fetchTeacherStudents = createServerFn({ method: "GET" })
    .inputValidator((data: { search?: string }) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        const { getTeacherStudents: fn } = await import("~/server/classrooms");
        return fn(getRequestHeaders(), data.search);
    });

const addStudent = createServerFn({ method: "POST" })
    .inputValidator((data: { classId: string; studentId: string }) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        const { addStudentToClass: fn } = await import("~/server/classrooms");
        return fn(getRequestHeaders(), data.classId, data.studentId);
    });

const removeStudent = createServerFn({ method: "POST" })
    .inputValidator((data: { classId: string; studentId: string }) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        const { removeStudentFromClass: fn } = await import("~/server/classrooms");
        return fn(getRequestHeaders(), data.classId, data.studentId);
    });

export const Route = createFileRoute("/dashboard/classrooms/$classId")({
    loader: async ({ params }) => {
        const result = await fetchClassroom({ data: { classId: params.classId } });
        if (result.status === "unauthenticated") {
            throw redirect({ href: "/sign-in?next=/dashboard/classrooms" });
        }
        return result;
    },
    component: ClassroomDetailPage,
});

function ClassroomDetailPage() {
    const router = useRouter();
    const loaderData = Route.useLoaderData();
    const [editing, setEditing] = createSignal(false);
    const [editName, setEditName] = createSignal("");
    const [editDescription, setEditDescription] = createSignal("");
    const [savingEdit, setSavingEdit] = createSignal(false);
    const [editError, setEditError] = createSignal<string | null>(null);
    const [confirmDelete, setConfirmDelete] = createSignal(false);
    const [deleting, setDeleting] = createSignal(false);
    const [studentSearch, setStudentSearch] = createSignal("");
    const [addingStudentId, setAddingStudentId] = createSignal<string | null>(null);
    const [removingStudentId, setRemovingStudentId] = createSignal<string | null>(null);

    const [classroom, { mutate: mutateClassroom }] = createResource(
        () => loaderData(),
        async (data): Promise<ClassroomDetail | null> => {
            if (data.status !== "ok") return null;
            return data.classroom;
        },
    );

    const [availableStudents, { refetch: refetchStudents }] = createResource(
        () => studentSearch(),
        async (search): Promise<ClassroomStudent[]> => {
            const result = await fetchTeacherStudents({
                data: { search: search || undefined },
            });
            if (result.status !== "ok") return [];
            const currentIds = new Set(classroom()?.students.map((s) => s.id) ?? []);
            return result.students.filter((s) => !currentIds.has(s.id));
        },
    );

    const startEditing = () => {
        const c = classroom();
        if (!c) return;
        setEditName(c.name);
        setEditDescription(c.description ?? "");
        setEditing(true);
    };

    const handleSaveEdit = async (event: Event) => {
        event.preventDefault();
        const c = classroom();
        if (!c) return;

        const trimmedName = editName().trim();
        if (!trimmedName) {
            setEditError("Name is required.");
            return;
        }

        setSavingEdit(true);
        setEditError(null);

        const result = await updateClassroom({
            data: {
                classId: c.id,
                name: trimmedName,
                description: editDescription().trim() || null,
            },
        });

        setSavingEdit(false);

        if (result.status !== "ok") {
            setEditError("Failed to update classroom.");
            return;
        }

        mutateClassroom(result.classroom);
        setEditing(false);
    };

    const handleDelete = async () => {
        const c = classroom();
        if (!c) return;

        setDeleting(true);
        const result = await deleteClassroom({ data: { classId: c.id } });
        setDeleting(false);

        if (result.status === "ok") {
            router.navigate({ to: "/dashboard" });
        }
    };

    const handleAddStudent = async (studentId: string) => {
        const c = classroom();
        if (!c) return;

        setAddingStudentId(studentId);
        const result = await addStudent({
            data: { classId: c.id, studentId },
        });
        setAddingStudentId(null);

        if (result.status === "ok") {
            mutateClassroom(result.classroom);
            refetchStudents();
        }
    };

    const handleRemoveStudent = async (studentId: string) => {
        const c = classroom();
        if (!c) return;

        setRemovingStudentId(studentId);
        const result = await removeStudent({
            data: { classId: c.id, studentId },
        });
        setRemovingStudentId(null);

        if (result.status === "ok") {
            mutateClassroom(result.classroom);
            refetchStudents();
        }
    };

    const handleStudentSearch = (event: Event) => {
        event.preventDefault();
        refetchStudents();
    };

    return (
        <div class="mx-auto max-w-4xl space-y-8 px-6 py-12">
            <Show
                when={classroom()}
                fallback={
                    <div class="text-sm text-slate-500">Loading classroom...</div>
                }
            >
                <div>
                    <a
                        href="/dashboard"
                        class="text-xs uppercase tracking-[0.3em] text-slate-500 hover:text-slate-700"
                    >
                        &larr; Back to dashboard
                    </a>
                    <Show
                        when={!editing()}
                        fallback={
                            <form class="mt-4 space-y-4" onSubmit={handleSaveEdit}>
                                <Show when={editError()}>
                                    <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                        {editError()}
                                    </div>
                                </Show>
                                <div class="space-y-2">
                                    <label class="text-xs uppercase tracking-[0.2em] text-slate-500" for="edit-name">
                                        Name
                                    </label>
                                    <input
                                        id="edit-name"
                                        class="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-lg font-semibold text-slate-700"
                                        type="text"
                                        value={editName()}
                                        onInput={(e) => setEditName(e.currentTarget.value)}
                                        required
                                    />
                                </div>
                                <div class="space-y-2">
                                    <label class="text-xs uppercase tracking-[0.2em] text-slate-500" for="edit-desc">
                                        Description
                                    </label>
                                    <textarea
                                        id="edit-desc"
                                        class="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700"
                                        rows={2}
                                        value={editDescription()}
                                        onInput={(e) => setEditDescription(e.currentTarget.value)}
                                    />
                                </div>
                                <div class="flex items-center gap-4">
                                    <button
                                        type="submit"
                                        disabled={savingEdit()}
                                        class="rounded-full bg-[color:var(--dashboard-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-50"
                                    >
                                        {savingEdit() ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditing(false)}
                                        class="text-sm text-slate-500 hover:text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        }
                    >
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <h1 class="mt-4 font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                                    {classroom()!.name}
                                </h1>
                                <Show when={classroom()!.description}>
                                    <p class="mt-2 text-sm text-slate-600">
                                        {classroom()!.description}
                                    </p>
                                </Show>
                                <div class="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                                    {classroom()!.students.length} student
                                    {classroom()!.students.length !== 1 ? "s" : ""}
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={startEditing}
                                    class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-white"
                                >
                                    Edit
                                </button>
                                <Show
                                    when={!confirmDelete()}
                                    fallback={
                                        <div class="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={deleting()}
                                                onClick={handleDelete}
                                                class="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {deleting() ? "Deleting..." : "Confirm"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDelete(false)}
                                                class="text-xs text-slate-500 hover:text-slate-700"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    }
                                >
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(true)}
                                        class="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-700 shadow-sm transition hover:bg-red-100"
                                    >
                                        Delete
                                    </button>
                                </Show>
                            </div>
                        </div>
                    </Show>
                </div>

                <div class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur">
                    <div class="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Students
                            </div>
                            <p class="mt-1 text-sm text-slate-600">
                                Manage student enrolments in this classroom.
                            </p>
                        </div>
                        <div class="rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {classroom()!.students.length} enrolled
                        </div>
                    </div>

                    <Show
                        when={classroom()!.students.length}
                        fallback={
                            <div class="mt-6 rounded-2xl border border-dashed border-white/70 bg-white/50 p-6 text-center text-sm text-slate-500">
                                No students enrolled yet. Search and add below.
                            </div>
                        }
                    >
                        <div class="mt-6 divide-y divide-white/70">
                            <For each={classroom()!.students}>
                                {(student) => (
                                    <div class="flex items-center justify-between gap-4 py-3">
                                        <div>
                                            <div class="text-sm font-medium text-[color:var(--dashboard-ink)]">
                                                {student.name}
                                            </div>
                                            <Show when={student.email}>
                                                <div class="text-xs text-slate-500">
                                                    {student.email}
                                                </div>
                                            </Show>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={removingStudentId() === student.id}
                                            onClick={() => handleRemoveStudent(student.id)}
                                            class="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                        >
                                            {removingStudentId() === student.id
                                                ? "Removing..."
                                                : "Remove"}
                                        </button>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>

                    <div class="mt-8 border-t border-white/70 pt-6">
                        <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                            Add students
                        </div>
                        <p class="mt-1 text-sm text-slate-600">
                            Search your students to add them to this classroom.
                        </p>

                        <form class="mt-4 flex flex-wrap gap-3" onSubmit={handleStudentSearch}>
                            <input
                                class="w-full sm:w-72 rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm text-slate-700"
                                type="text"
                                placeholder="Search students by name..."
                                value={studentSearch()}
                                onInput={(e) => setStudentSearch(e.currentTarget.value)}
                            />
                            <button
                                type="submit"
                                class="rounded-full bg-[color:var(--dashboard-accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                            >
                                Search
                            </button>
                        </form>

                        <Show
                            when={availableStudents()?.length}
                            fallback={
                                <div class="mt-4 text-sm text-slate-400">
                                    {studentSearch()
                                        ? "No matching students found."
                                        : "Type a name to search for students."}
                                </div>
                            }
                        >
                            <div class="mt-4 divide-y divide-white/70">
                                <For each={availableStudents()}>
                                    {(student) => (
                                        <div class="flex items-center justify-between gap-4 py-3">
                                            <div>
                                                <div class="text-sm font-medium text-[color:var(--dashboard-ink)]">
                                                    {student.name}
                                                </div>
                                                <Show when={student.email}>
                                                    <div class="text-xs text-slate-500">
                                                        {student.email}
                                                    </div>
                                                </Show>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={addingStudentId() === student.id}
                                                onClick={() => handleAddStudent(student.id)}
                                                class="rounded-full bg-[color:var(--dashboard-accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--dashboard-accent-strong)] transition hover:bg-[color:var(--dashboard-accent)] hover:text-white disabled:opacity-50"
                                            >
                                                {addingStudentId() === student.id
                                                    ? "Adding..."
                                                    : "Add"}
                                            </button>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
    );
}

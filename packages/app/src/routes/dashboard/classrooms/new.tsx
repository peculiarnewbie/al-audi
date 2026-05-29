import { createFileRoute, redirect, useRouter } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { Show, createSignal } from "solid-js";
import type { ClassroomMutationResult } from "~/server/classrooms";

const createClassroom = createServerFn({ method: "POST" })
    .inputValidator((data: { name: string; description?: string }) => data)
    .handler(async ({ data }) => {
        const { getRequestHeaders } = await import("@tanstack/solid-start/server");
        const { createClassroom: fn } = await import("~/server/classrooms");
        return fn(getRequestHeaders(), data);
    });

export const Route = createFileRoute("/dashboard/classrooms/new")({
    component: NewClassroomPage,
});

function NewClassroomPage() {
    const router = useRouter();
    const [name, setName] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [saving, setSaving] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        const trimmedName = name().trim();
        if (!trimmedName) {
            setError("Classroom name is required.");
            return;
        }

        setSaving(true);
        setError(null);

        const result = await createClassroom({
            data: {
                name: trimmedName,
                description: description().trim() || undefined,
            },
        });

        setSaving(false);

        if (result.status === "unauthenticated") {
            throw redirect({ href: "/sign-in?next=/dashboard/classrooms/new" });
        }

        if (result.status === "forbidden") {
            setError("Only teachers can create classrooms.");
            return;
        }

        if (result.status !== "ok") {
            setError("Failed to create classroom.");
            return;
        }

        router.navigate({ to: "/dashboard/classrooms/$classId", params: { classId: result.classroom.id } });
    };

    return (
        <div class="mx-auto max-w-2xl space-y-8 px-6 py-12">
            <div>
                <a
                    href="/dashboard"
                    class="text-xs uppercase tracking-[0.3em] text-slate-500 hover:text-slate-700"
                >
                    &larr; Back to dashboard
                </a>
                <h1 class="mt-4 font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                    New classroom
                </h1>
                <p class="mt-2 text-sm text-slate-600">
                    Create a group for your students to organise assignments and resources.
                </p>
            </div>

            <form class="space-y-6" onSubmit={handleSubmit}>
                <Show when={error()}>
                    <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {error()}
                    </div>
                </Show>

                <div class="space-y-2">
                    <label class="text-xs uppercase tracking-[0.2em] text-slate-500" for="name">
                        Name
                    </label>
                    <input
                        id="name"
                        class="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700"
                        type="text"
                        placeholder="e.g. English 101, Advanced Grammar"
                        value={name()}
                        onInput={(e) => setName(e.currentTarget.value)}
                        required
                    />
                </div>

                <div class="space-y-2">
                    <label class="text-xs uppercase tracking-[0.2em] text-slate-500" for="description">
                        Description (optional)
                    </label>
                    <textarea
                        id="description"
                        class="w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700"
                        placeholder="Brief description of this classroom"
                        rows={3}
                        value={description()}
                        onInput={(e) => setDescription(e.currentTarget.value)}
                    />
                </div>

                <div class="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={saving()}
                        class="rounded-full bg-[color:var(--dashboard-accent)] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)] disabled:opacity-50"
                    >
                        {saving() ? "Creating..." : "Create classroom"}
                    </button>
                    <a
                        href="/dashboard"
                        class="text-sm text-slate-500 hover:text-slate-700"
                    >
                        Cancel
                    </a>
                </div>
            </form>
        </div>
    );
}

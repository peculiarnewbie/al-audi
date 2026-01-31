import { Link, createFileRoute, redirect } from "@tanstack/solid-router";
import { For, Show, createSignal } from "solid-js";
import { getDashboardData } from "~/server/dashboard";
import type { DashboardClassroom, DashboardResource } from "~/server/dashboard";

export const Route = createFileRoute("/dashboard")({
    loader: async () => {
        const data = await getDashboardData();

        if (!data) {
            throw redirect({ href: "/api/auth/sign-in" });
        }

        return data;
    },
    component: DashboardPage,
});

const formatDate = (value: number) =>
    new Date(value).toISOString().slice(0, 10);

const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes)) {
        return "N/A";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
};

const formatResourceType = (contentType: string) => {
    if (contentType.startsWith("image/")) {
        return "Image";
    }

    if (contentType.startsWith("audio/")) {
        return "Audio";
    }

    if (contentType === "application/pdf") {
        return "PDF";
    }

    return "File";
};

const buildClassroomsTitle = (role: string) => {
    if (role === "teacher") {
        return "Your classrooms";
    }

    if (role === "student") {
        return "Enrolled classrooms";
    }

    if (role === "admin") {
        return "School classrooms";
    }

    return "Classrooms";
};

const buildResourcesTitle = (role: string) => {
    if (role === "teacher") {
        return "Your resources";
    }

    if (role === "student") {
        return "Shared resources";
    }

    if (role === "admin") {
        return "School resources";
    }

    return "Resources";
};

const buildResourcesDescription = (role: string) => {
    if (role === "teacher") {
        return "Recent files from your drive to share with learners.";
    }

    if (role === "student") {
        return "Resources your teachers have shared with you.";
    }

    if (role === "admin") {
        return "Recently uploaded drive resources across the school.";
    }

    return "Resources available to you.";
};

const buildClassroomsEmptyMessage = (role: string) => {
    if (role === "teacher") {
        return "Create a classroom to start assigning activities.";
    }

    if (role === "student") {
        return "Once a teacher adds you to a classroom, it will appear here.";
    }

    if (role === "admin") {
        return "No classrooms created yet. Visit the admin panel to manage access.";
    }

    return "Classrooms will show up here when assigned.";
};

const buildResourcesEmptyMessage = (role: string) => {
    if (role === "teacher") {
        return "Upload resources to the drive and they will appear here.";
    }

    if (role === "student") {
        return "Shared resources will appear once your teacher adds them.";
    }

    if (role === "admin") {
        return "No drive resources uploaded yet.";
    }

    return "Resources will appear here when available.";
};

const buildRoleLabel = (role: string) => {
    if (role === "teacher") {
        return "Teacher";
    }

    if (role === "student") {
        return "Student";
    }

    if (role === "admin") {
        return "Admin";
    }

    return "Member";
};

function DashboardPage() {
    const data = Route.useLoaderData();
    const [sidebarOpen, setSidebarOpen] = createSignal(false);
    const user = () => data().user;
    const classrooms = () => data().classrooms;
    const resources = () => data().resources;
    const isTeacher = () => user().role === "teacher";
    const isAdmin = () => user().role === "admin";

    const closeSidebar = () => setSidebarOpen(false);

    const sidebarClass = () =>
        `fixed inset-y-0 left-0 z-50 w-[min(20rem,85vw)] translate-x-0 transform rounded-none border border-white/60 bg-white/90 p-6 shadow-xl backdrop-blur transition-transform duration-300 lg:static lg:translate-x-0 lg:w-72 lg:rounded-3xl ${
            sidebarOpen()
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
        }`;

    return (
        <div class="relative mx-auto flex max-w-6xl gap-6 px-4 pb-16 pt-6 lg:px-6">
            <Show when={sidebarOpen()}>
                <button
                    type="button"
                    aria-label="Close navigation"
                    class="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
                    onClick={closeSidebar}
                />
            </Show>

            <aside class={sidebarClass()}>
                <div class="flex h-full flex-col gap-6">
                    <div class="flex items-start justify-between">
                        <div>
                            <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Dashboard
                            </div>
                            <div class="text-lg font-semibold text-[color:var(--dashboard-ink)]">
                                Learning studio
                            </div>
                        </div>
                        <button
                            type="button"
                            aria-label="Close navigation"
                            class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-500 shadow-sm lg:hidden"
                            onClick={closeSidebar}
                        >
                            Close
                        </button>
                    </div>

                    <div class="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                        <div class="text-xs uppercase tracking-wide text-slate-500">
                            Signed in
                        </div>
                        <div class="mt-2 text-lg font-semibold text-[color:var(--dashboard-ink)]">
                            {user().name}
                        </div>
                        <Show when={user().email}>
                            <div class="text-sm text-slate-500">
                                {user().email}
                            </div>
                        </Show>
                        <div class="mt-3 inline-flex items-center rounded-full bg-[color:var(--dashboard-accent-soft)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--dashboard-accent-strong)]">
                            {buildRoleLabel(user().role)}
                        </div>
                    </div>

                    <nav class="space-y-2 text-sm text-slate-600">
                        <Link
                            to="/dashboard"
                            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/70 hover:text-slate-900"
                        >
                            Overview
                        </Link>
                        <a
                            href="#classrooms"
                            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/70 hover:text-slate-900"
                            onClick={closeSidebar}
                        >
                            Classrooms
                        </a>
                        <a
                            href="#resources"
                            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/70 hover:text-slate-900"
                            onClick={closeSidebar}
                        >
                            Resources
                        </a>
                        <Link
                            to="/reports"
                            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/70 hover:text-slate-900"
                        >
                            Reports
                        </Link>
                        <Link
                            to="/room"
                            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/70 hover:text-slate-900"
                        >
                            Live rooms
                        </Link>
                        <Link
                            to="/user"
                            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/70 hover:text-slate-900"
                        >
                            Account
                        </Link>
                    </nav>

                    <div class="space-y-2">
                        <Show when={isTeacher()}>
                            <Link
                                to="/quizzes/new"
                                class="flex items-center justify-between rounded-xl bg-[color:var(--dashboard-accent)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                            >
                                Create quiz
                            </Link>
                        </Show>
                        <Show when={isAdmin()}>
                            <Link
                                to="/admin"
                                class="flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                            >
                                Admin panel
                            </Link>
                        </Show>
                    </div>

                    <div class="mt-auto">
                        <a
                            href="/api/auth/sign-out"
                            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white/70 hover:text-slate-700"
                        >
                            Sign out
                        </a>
                    </div>
                </div>
            </aside>

            <main class="flex-1 space-y-8 pb-8">
                <div class="flex items-center justify-between lg:hidden">
                    <button
                        type="button"
                        aria-label="Open navigation"
                        aria-expanded={sidebarOpen()}
                        class="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm"
                        onClick={() => setSidebarOpen(true)}
                    >
                        Menu
                    </button>
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Dashboard
                    </div>
                    <div class="rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {buildRoleLabel(user().role)}
                    </div>
                </div>

                <section class="dashboard-rise dashboard-stagger-1 rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur">
                    <div class="flex flex-wrap items-start justify-between gap-6">
                        <div class="space-y-3">
                            <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Overview
                            </div>
                            <h1
                                class="text-3xl font-semibold text-[color:var(--dashboard-ink)] md:text-4xl"
                                style={{
                                    "font-family": "'Fraunces', serif",
                                }}
                            >
                                Welcome back, {user().name}.
                            </h1>
                            <p class="text-sm text-slate-600 md:text-base">
                                Keep classrooms, resources, and teaching tools
                                in one calm workspace.
                            </p>
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <Show when={isTeacher()}>
                                <Link
                                    to="/quizzes/new"
                                    class="rounded-full bg-[color:var(--dashboard-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--dashboard-accent-strong)]"
                                >
                                    Make a quiz
                                </Link>
                            </Show>
                            <Show when={isAdmin()}>
                                <Link
                                    to="/admin"
                                    class="rounded-full border border-slate-200 bg-white/90 px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                                >
                                    Open admin
                                </Link>
                            </Show>
                        </div>
                    </div>

                    <div class="mt-8 grid gap-4 sm:grid-cols-2">
                        <div class="rounded-2xl border border-white/70 bg-[color:var(--dashboard-wash)] p-4">
                            <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Classrooms
                            </div>
                            <div class="mt-2 text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                                {classrooms().length}
                            </div>
                            <div class="mt-1 text-sm text-slate-600">
                                Active groups connected to your account.
                            </div>
                        </div>
                        <div class="rounded-2xl border border-white/70 bg-[color:var(--dashboard-wash)] p-4">
                            <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                Resources
                            </div>
                            <div class="mt-2 text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                                {resources().length}
                            </div>
                            <div class="mt-1 text-sm text-slate-600">
                                Recent files available in your drive.
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    id="classrooms"
                    class="dashboard-rise dashboard-stagger-2 scroll-mt-24 space-y-4"
                >
                    <div class="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2
                                class="text-2xl font-semibold text-[color:var(--dashboard-ink)]"
                                style={{
                                    "font-family": "'Fraunces', serif",
                                }}
                            >
                                {buildClassroomsTitle(user().role)}
                            </h2>
                            <p class="text-sm text-slate-600">
                                {isTeacher()
                                    ? "Track each classroom and its progress."
                                    : "See the classrooms connected to you."}
                            </p>
                        </div>
                        <div class="rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {classrooms().length} total
                        </div>
                    </div>

                    <Show
                        when={classrooms().length}
                        fallback={
                            <div class="rounded-3xl border border-white/70 bg-white/80 p-6 text-sm text-slate-600 shadow-sm">
                                {buildClassroomsEmptyMessage(user().role)}
                            </div>
                        }
                    >
                        <div class="grid gap-4 md:grid-cols-2">
                            <For each={classrooms()}>
                                {(classroom: DashboardClassroom) => (
                                    <div class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                                        <div class="flex items-start justify-between gap-4">
                                            <div>
                                                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                                    Classroom
                                                </div>
                                                <div class="mt-2 text-lg font-semibold text-[color:var(--dashboard-ink)]">
                                                    {classroom.name}
                                                </div>
                                                <Show
                                                    when={classroom.description}
                                                >
                                                    <div class="mt-2 text-sm text-slate-600">
                                                        {classroom.description}
                                                    </div>
                                                </Show>
                                            </div>
                                            <div class="rounded-2xl bg-[color:var(--dashboard-accent-soft)] px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--dashboard-accent-strong)]">
                                                {classroom.studentCount}{" "}
                                                students
                                            </div>
                                        </div>
                                        <div class="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">
                                            ID {classroom.id}
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </section>

                <section
                    id="resources"
                    class="dashboard-rise dashboard-stagger-3 scroll-mt-24 space-y-4"
                >
                    <div class="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2
                                class="text-2xl font-semibold text-[color:var(--dashboard-ink)]"
                                style={{
                                    "font-family": "'Fraunces', serif",
                                }}
                            >
                                {buildResourcesTitle(user().role)}
                            </h2>
                            <p class="text-sm text-slate-600">
                                {buildResourcesDescription(user().role)}
                            </p>
                        </div>
                        <div class="rounded-full bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {resources().length} items
                        </div>
                    </div>

                    <Show
                        when={resources().length}
                        fallback={
                            <div class="rounded-3xl border border-white/70 bg-white/80 p-6 text-sm text-slate-600 shadow-sm">
                                {buildResourcesEmptyMessage(user().role)}
                            </div>
                        }
                    >
                        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <For each={resources()}>
                                {(resource: DashboardResource) => (
                                    <div class="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
                                        <div class="flex items-center justify-between">
                                            <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                                {formatResourceType(
                                                    resource.contentType,
                                                )}
                                            </div>
                                            <div class="rounded-full bg-[color:var(--dashboard-wash)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                                {formatFileSize(
                                                    resource.fileSize,
                                                )}
                                            </div>
                                        </div>
                                        <div class="mt-3 text-base font-semibold text-[color:var(--dashboard-ink)]">
                                            {resource.fileName}
                                        </div>
                                        <Show when={resource.folderName}>
                                            <div class="mt-2 text-sm text-slate-600">
                                                Folder: {resource.folderName}
                                            </div>
                                        </Show>
                                        <div class="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">
                                            Added{" "}
                                            {formatDate(resource.createdAt)}
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                </section>
            </main>
        </div>
    );
}

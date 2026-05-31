import { createFileRoute, redirect } from "@tanstack/solid-router";
import { For, Show, createSignal } from "solid-js";
import { getTeacherReport } from "~/server/reporting";

export const Route = createFileRoute("/reports")({
    loader: async () => {
        const report = await getTeacherReport();

        if (!report) {
            throw redirect({ href: "/sign-in?next=/reports" });
        }

        return report;
    },
    component: ReportsPage,
});

type ReportView = "classes" | "students";

type StatItemProps = {
    label: string;
    value: string;
};

function formatDate(value: number | null) {
    return value ? new Date(value).toISOString().slice(0, 10) : "-";
}

function formatPercent(value: number | null) {
    return value === null ? "-" : String(value) + "%";
}

function tabClass(isActive: boolean) {
    if (isActive) {
        return "px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.2em] transition-colors bg-[color:var(--dashboard-accent)] text-white";
    }
    return "px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.2em] transition-colors border border-white/70 bg-white/80 text-slate-600 hover:text-slate-900";
}

function StatItem(props: StatItemProps) {
    return (
        <div>
            <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                {props.label}
            </div>
            <div class="text-lg text-[color:var(--dashboard-ink)]">
                {props.value}
            </div>
        </div>
    );
}

function ReportsPage() {
    const report = Route.useLoaderData();
    const [view, setView] = createSignal<ReportView>("classes");

    return (
        <div class="mx-auto max-w-6xl px-6 py-12 space-y-8">
            <header class="space-y-2">
                <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Teacher reporting
                </div>
                <h1 class="font-display text-3xl font-semibold text-[color:var(--dashboard-ink)]">
                    Reporting dashboard
                </h1>
                <p class="text-slate-600">
                    Track class progress, assignments, and quiz performance.
                </p>
                <div class="flex items-center gap-4">
                    <div class="text-xs uppercase tracking-[0.3em] text-slate-400">
                        Updated {formatDate(report().generatedAt)}
                    </div>
                    <a
                        href="/reports/live"
                        class="text-xs uppercase tracking-[0.2em] text-[color:var(--dashboard-accent)] hover:underline"
                    >
                        Live sessions &rarr;
                    </a>
                </div>
            </header>

            <div class="flex flex-wrap gap-3">
                <button
                    class={tabClass(view() === "classes")}
                    type="button"
                    onClick={() => setView("classes")}
                >
                    Class view
                </button>
                <button
                    class={tabClass(view() === "students")}
                    type="button"
                    onClick={() => setView("students")}
                >
                    Student view
                </button>
            </div>

            <Show
                when={view() === "classes"}
                fallback={
                    <Show
                        when={report().students.length}
                        fallback={
                            <div class="glass-panel p-6">
                                <div class="text-sm text-slate-600">
                                    No student activity yet.
                                </div>
                            </div>
                        }
                    >
                        <div class="grid gap-4">
                            <For each={report().students}>
                                {(student) => (
                                    <a
                                        href={"/reports/students/" + student.id}
                                        class="glass-card p-6 space-y-4 block hover:opacity-80 transition-opacity"
                                    >
                                        <div>
                                            <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                                Student
                                            </div>
                                            <div class="text-lg font-semibold text-[color:var(--dashboard-ink)]">
                                                {student.name}
                                            </div>
                                            <Show when={student.email}>
                                                <div class="text-sm text-slate-600">
                                                    {student.email}
                                                </div>
                                            </Show>
                                        </div>
                                        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <StatItem
                                                label="Classes"
                                                value={String(student.classCount)}
                                            />
                                            <StatItem
                                                label="Assignments"
                                                value={String(student.assignmentCount)}
                                            />
                                            <StatItem
                                                label="Attempts"
                                                value={String(student.attemptCount)}
                                            />
                                            <StatItem
                                                label="Avg score"
                                                value={formatPercent(
                                                    student.averageScore,
                                                )}
                                            />
                                            <StatItem
                                                label="Last attempt"
                                                value={formatDate(
                                                    student.lastAttemptAt,
                                                )}
                                            />
                                        </div>
                                    </a>
                                )}
                            </For>
                        </div>
                    </Show>
                }
            >
                <Show
                    when={report().classes.length}
                    fallback={
                        <div class="glass-panel p-6">
                            <div class="text-sm text-slate-600">
                                No class activity yet.
                            </div>
                        </div>
                    }
                >
                    <div class="grid gap-4">
                        <For each={report().classes}>
                            {(classReport) => (
                                <div class="glass-card p-6 space-y-4">
                                    <div>
                                        <div class="text-xs uppercase tracking-[0.3em] text-slate-500">
                                            Class
                                        </div>
                                        <div class="text-lg font-semibold text-[color:var(--dashboard-ink)]">
                                            {classReport.name}
                                        </div>
                                        <Show when={classReport.description}>
                                            <div class="text-sm text-slate-600">
                                                {classReport.description}
                                            </div>
                                        </Show>
                                    </div>
                                    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <StatItem
                                            label="Students"
                                            value={String(classReport.studentCount)}
                                        />
                                        <StatItem
                                            label="Assignments"
                                            value={String(classReport.assignmentCount)}
                                        />
                                        <StatItem
                                            label="Attempts"
                                            value={String(classReport.attemptCount)}
                                        />
                                        <StatItem
                                            label="Avg score"
                                            value={formatPercent(
                                                classReport.averageScore,
                                            )}
                                        />
                                        <StatItem
                                            label="Last attempt"
                                            value={formatDate(
                                                classReport.lastAttemptAt,
                                            )}
                                        />
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>
            </Show>
        </div>
    );
}

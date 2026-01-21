import { createFileRoute, redirect } from "@tanstack/solid-router";
import { For, Show, createSignal } from "solid-js";
import { getTeacherReport } from "~/server/reporting";

export const Route = createFileRoute("/reports")({
    loader: async () => {
        const report = await getTeacherReport();

        if (!report) {
            throw redirect({ href: "/api/auth/sign-in" });
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

const formatDate = (value: number | null) =>
    value ? new Date(value).toISOString().slice(0, 10) : "—";

const formatPercent = (value: number | null) =>
    value === null ? "—" : `${value}%`;

const tabClass = (isActive: boolean) =>
    `px-4 py-2 rounded text-sm font-medium transition-colors ${
        isActive
            ? "bg-stone-800 text-white"
            : "border border-stone-300 text-stone-700 hover:text-stone-900"
    }`;

function StatItem(props: StatItemProps) {
    return (
        <div>
            <div class="text-xs uppercase tracking-wide text-stone-500">
                {props.label}
            </div>
            <div class="text-lg text-stone-800">{props.value}</div>
        </div>
    );
}

function ReportsPage() {
    const report = Route.useLoaderData();
    const [view, setView] = createSignal<ReportView>("classes");

    return (
        <div class="max-w-5xl mx-auto px-6 py-12 space-y-8">
            <header class="space-y-2">
                <div class="text-xs uppercase tracking-wide text-stone-500">
                    Teacher reporting
                </div>
                <h1 class="text-2xl font-semibold text-stone-800">
                    Reporting dashboard
                </h1>
                <p class="text-stone-600">
                    Track class progress, assignments, and quiz performance.
                </p>
                <div class="text-xs uppercase tracking-wide text-stone-400">
                    Updated {formatDate(report().generatedAt)}
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
                            <div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                                <div class="text-sm text-stone-600">
                                    No student activity yet.
                                </div>
                            </div>
                        }
                    >
                        <div class="grid gap-4">
                            <For each={report().students}>
                                {(student) => (
                                    <div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
                                        <div>
                                            <div class="text-xs uppercase tracking-wide text-stone-500">
                                                Student
                                            </div>
                                            <div class="text-lg font-semibold text-stone-800">
                                                {student.name}
                                            </div>
                                            <Show when={student.email}>
                                                <div class="text-sm text-stone-600">
                                                    {student.email}
                                                </div>
                                            </Show>
                                        </div>
                                        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            <StatItem
                                                label="Classes"
                                                value={student.classCount.toString()}
                                            />
                                            <StatItem
                                                label="Assignments"
                                                value={student.assignmentCount.toString()}
                                            />
                                            <StatItem
                                                label="Attempts"
                                                value={student.attemptCount.toString()}
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
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                }
            >
                <Show
                    when={report().classes.length}
                    fallback={
                        <div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                            <div class="text-sm text-stone-600">
                                No class activity yet.
                            </div>
                        </div>
                    }
                >
                    <div class="grid gap-4">
                        <For each={report().classes}>
                            {(classReport) => (
                                <div class="rounded-xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
                                    <div>
                                        <div class="text-xs uppercase tracking-wide text-stone-500">
                                            Class
                                        </div>
                                        <div class="text-lg font-semibold text-stone-800">
                                            {classReport.name}
                                        </div>
                                        <Show when={classReport.description}>
                                            <div class="text-sm text-stone-600">
                                                {classReport.description}
                                            </div>
                                        </Show>
                                    </div>
                                    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <StatItem
                                            label="Students"
                                            value={classReport.studentCount.toString()}
                                        />
                                        <StatItem
                                            label="Assignments"
                                            value={classReport.assignmentCount.toString()}
                                        />
                                        <StatItem
                                            label="Attempts"
                                            value={classReport.attemptCount.toString()}
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
